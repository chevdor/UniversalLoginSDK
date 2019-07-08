import {utils, Wallet, Contract, providers} from 'ethers';
import WalletContract from '@universal-login/contracts/build/WalletMaster.json';
import {resolveName, MANAGEMENT_KEY, OPERATION_CALL, calculateMessageHash, waitForContractDeploy, Message, SignedMessage, createSignedMessage, MessageWithFrom, ensure, ensureNotNull, stringifySignedMessageFields, MessageStatus, PublicRelayerConfig} from '@universal-login/commons';
import RelayerObserver from './observers/RelayerObserver';
import BlockchainObserver from './observers/BlockchainObserver';
import {BalanceObserver} from './observers/BalanceObserver';
import {DeploymentObserver} from './observers/DeploymentObserver';
import MESSAGE_DEFAULTS from './config';
import {RelayerApi} from './RelayerApi';
import {retry} from './utils/retry';
import {BlockchainService} from './services/BlockchainService';
import {MissingConfiguration} from './utils/errors';
import {FutureWalletFactory} from './services/FutureWalletFactory';
import {CancelAuthorisationRequest, signCancelAuthorisationRequest} from '@universal-login/commons';

class UniversalLoginSDK {
  provider: providers.Provider;
  relayerApi: RelayerApi;
  relayerObserver: RelayerObserver;
  blockchainObserver: BlockchainObserver;
  balanceObserver?: BalanceObserver;
  deploymentObserver?: DeploymentObserver;
  blockchainService: BlockchainService;
  futureWalletFactory?: FutureWalletFactory;
  defaultPaymentOptions: Message;
  config?: PublicRelayerConfig;
  factoryAddress?: string;

  constructor(
    relayerUrl: string,
    providerOrUrl: string | providers.Provider,
    paymentOptions?: Message,
  ) {
    this.provider = typeof(providerOrUrl) === 'string' ?
      new providers.JsonRpcProvider(providerOrUrl, {chainId: 0} as any)
      : providerOrUrl;
    this.relayerApi = new RelayerApi(relayerUrl);
    this.relayerObserver = new RelayerObserver(this.relayerApi);
    this.blockchainService = new BlockchainService(this.provider);
    this.blockchainObserver = new BlockchainObserver(this.blockchainService);
    this.defaultPaymentOptions = {...MESSAGE_DEFAULTS, ...paymentOptions};
  }

  async create(ensName: string): Promise<[string, string]> {
    const {address, privateKey} = Wallet.createRandom();
    const result = await this.relayerApi.createWallet(address, ensName);
    const contract = await waitForContractDeploy(
      this.provider,
      WalletContract,
      result.transaction.hash,
    );
    return [privateKey, contract.address];
  }

  async createFutureWallet() {
    await this.getRelayerConfig();
    this.getFutureWalletFactory();
    return this.futureWalletFactory!.createFutureWallet();
  }

  async addKey(
    to: string,
    publicKey: string,
    privateKey: string,
    transactionDetails: Message,
    keyPurpose = MANAGEMENT_KEY,
  ) {
    const key = publicKey;
    const data = new utils.Interface(WalletContract.interface).functions.addKey.encode([key, keyPurpose]);
    const message = {
      ...transactionDetails,
      to,
      from: to,
      data,
    };
    return this.execute(message, privateKey);
  }

  async addKeys(
    to: string,
    publicKeys: string[],
    privateKey: string,
    transactionDetails: SignedMessage,
    keyPurpose = MANAGEMENT_KEY,
  ) {
    const keys = publicKeys.map((publicKey) => publicKey);
    const keyRoles = new Array(publicKeys.length).fill(keyPurpose);
    const data = new utils.Interface(WalletContract.interface).functions.addKeys.encode([keys, keyRoles]);
    const message = {
      ...transactionDetails,
      to,
      from: to,
      data,
    };
    return this.execute(message, privateKey);
  }

  async removeKey(
    to: string,
    address: string,
    privateKey: string,
    transactionDetails: SignedMessage,
  ) {
    const key = address;
    const data = new utils.Interface(WalletContract.interface).functions.removeKey.encode([key, MANAGEMENT_KEY]);
    const message = {
      ...transactionDetails,
      to,
      from: to,
      value: 0,
      data,
      operationType: OPERATION_CALL,
    };
    return this.execute(message, privateKey);
  }

  async setRequiredSignatures(
    to: string,
    requiredSignatures: number,
    privateKey: string,
    transactionDetails: SignedMessage,
  ) {
    const data = new utils.Interface(WalletContract.interface).functions.setRequiredSignatures.encode([requiredSignatures]);
    const message = {
      ...transactionDetails,
      to,
      from: to,
      value: 0,
      data,
      operationType: OPERATION_CALL,
    };
    return this.execute(message, privateKey);
  }

  async getMessageStatus(message: SignedMessage) {
    const messageHash = calculateMessageHash(message);
    return this.relayerApi.getStatus(messageHash);
  }

  generatePrivateKey() {
    return Wallet.createRandom().privateKey;
  }

  async getRelayerConfig() {
    return this.config = this.config || (await this.relayerApi.getConfig()).config;
  }

  async getBalanceObserver() {
    ensureNotNull(this.config, MissingConfiguration);
    this.balanceObserver = this.balanceObserver || new BalanceObserver(this.config!.supportedTokens, this.provider);
  }

  async getDeploymentObserver() {
    ensureNotNull(this.config, MissingConfiguration);
    this.deploymentObserver = this.deploymentObserver || new DeploymentObserver(this.blockchainService, this.config!.contractWhiteList);
  }

  private getFutureWalletFactory() {
    ensureNotNull(this.config, Error, 'Relayer configuration not yet loaded');
    const {chainSpec, ...futureWalletConfig} = this.config!;
    this.futureWalletFactory = this.futureWalletFactory || new FutureWalletFactory(futureWalletConfig, this.provider, this.blockchainService, this.relayerApi);
  }

  private isExecuted (messageStatus: MessageStatus){
    return !!messageStatus.transactionHash || !!messageStatus.error;
  }

  async waitForStatus(messageHash: string) {
    const getStatus = async () => this.relayerApi.getStatus(messageHash);
    const isNotExecuted = (messageStatus: MessageStatus) => !this.isExecuted(messageStatus);
    const status = await retry(getStatus, isNotExecuted);
    if (status.error) {
      throw Error(status.error);
    }
    return status;
  }

  async execute(message: Message, privateKey: string): Promise<MessageStatus> {
    const unsignedMessage = {
      ...this.defaultPaymentOptions,
      ...message,
      nonce: message.nonce || parseInt(await this.getNonce(message.from!, privateKey), 10),
    } as MessageWithFrom;
    const signedMessage = await createSignedMessage(unsignedMessage, privateKey);
    const result = await this.relayerApi.execute(stringifySignedMessageFields(signedMessage));
    if (result.status.messageHash) {
      const status = await this.waitForStatus(result.status.messageHash);
      ensure(!status.error, Error, status.error);
      const {transactionHash} = status;
      result.status.transactionHash = transactionHash;
    }
    return result.status;
  }

  async getNonce(walletContractAddress: string, privateKey: string) {
    const wallet = new Wallet(privateKey, this.provider);
    const contract = new Contract(walletContractAddress, WalletContract.interface, wallet);
    return contract.lastNonce();
  }

  async getWalletContractAddress(ensName: string) {
    const walletContractAddress = await this.resolveName(ensName);
    if (walletContractAddress && await this.blockchainService.getCode(walletContractAddress)) {
      return walletContractAddress;
    }
    return null;
  }

  async walletContractExist(ensName: string) {
    const walletContractAddress = await this.getWalletContractAddress(ensName);
    return walletContractAddress !== null;
  }

  async resolveName(ensName: string) {
    await this.getRelayerConfig();
    const {ensAddress} = this.config!.chainSpec;
    return resolveName(this.provider, ensAddress, ensName);
  }

  async connect(walletContractAddress: string) {
    const {address, privateKey} = Wallet.createRandom();
    await this.relayerApi.connect(walletContractAddress, address.toLowerCase());
    return privateKey;
  }

  async denyRequest(walletContractAddress: string, publicKey: string, privateKey: string) {
    const cancelAuthorisationRequest: CancelAuthorisationRequest = {
      walletContractAddress,
      key: publicKey
    };
    await this.relayerApi.denyConnection(
      walletContractAddress,
      publicKey,
      signCancelAuthorisationRequest(cancelAuthorisationRequest, privateKey)
    );
    return publicKey;
  }

  async fetchPendingAuthorisations(walletContractAddress: string) {
    return this.relayerObserver.fetchPendingAuthorisations(walletContractAddress);
  }

  subscribe(eventType: string, filter: any, callback: Function) {
    if (['AuthorisationsChanged'].includes(eventType)) {
      return this.relayerObserver.subscribe(eventType, filter, callback);
    } else if (['KeyAdded', 'KeyRemoved'].includes(eventType)) {
      return this.blockchainObserver.subscribe(eventType, filter, callback);
    }
    throw `Unknown event type: ${eventType}`;
  }

  async start() {
    await this.relayerObserver.start();
    await this.blockchainObserver.start();
  }

  stop() {
    this.relayerObserver.stop();
    this.blockchainObserver.stop();
  }

  async finalizeAndStop() {
    await this.relayerObserver.finalizeAndStop();
    await this.blockchainObserver.finalizeAndStop();
  }
}

export default UniversalLoginSDK;
export {SdkSigner} from './SdkSigner';
export {FutureWallet, BalanceDetails} from './services/FutureWalletFactory';
