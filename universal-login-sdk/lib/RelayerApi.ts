import {http, HttpFunction} from './utils/http';
import { utils } from 'ethers';

export class RelayerApi {
  private http: HttpFunction;
  constructor(relayerUrl: string) {
    this.http = http(relayerUrl);
  }

  async createWallet(managementKey: string, ensName: string) {
    return this.http('POST', '/wallet', {
      managementKey,
      ensName
    }).catch((e) => {
      // TODO: Maybe wrap this as a custom Error?
      throw new Error(e !== undefined && e.error);
    });
  }

  async getConfig() {
    return this.http('GET', '/config');
  }

  async execute(message: any) {
    return this.http('POST', '/wallet/execution', message)
      .catch((e) => {
        // TODO: Maybe wrap this as a custom Error?
        throw new Error(e !== undefined && e.error);
      });
  }

  async getStatus(messageHash: string) {
    return this.http('GET', `/wallet/execution/${messageHash}`);
  }

  async connect(walletContractAddress: string, key: string) {
    return this.http('POST', '/authorisation', {
      walletContractAddress,
      key,
    });
  }

  async denyConnection(walletContractAddress: string, key: string, signedCancelAuthorisationRequest: utils.Signature) {
    return this.http('POST', `/authorisation/${walletContractAddress}`, {
      walletContractAddress,
      key,
      signedCancelAuthorisationRequest
    }).catch((e) => {
      console.log(e)
      throw new Error(e)
    });
  }

  async getPendingAuthorisations(walletContractAddress: string) {
    return this.http('GET', `/authorisation/${walletContractAddress}`);
  }

  async deploy(publicKey: string, ensName: string) {
    return this.http('POST', '/wallet/deploy', {
      publicKey,
      ensName
    });
  }
}
