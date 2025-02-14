import chai, {expect} from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import {utils, Wallet} from 'ethers';
import {ETHER_NATIVE_TOKEN} from '@universal-login/commons';
import TransferService, {encodeTransfer} from '../../../src/integration/ethereum/TransferService';

chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('TransferService', () => {
  function setup() {
    const sdk = {
      execute: sinon.fake()
    } as any;
    const walletService = {
      userWallet: {
        privateKey: 'PRIVATE_KEY',
        contractAddress: 'CONTRACT_ADDRESS',
      } as any
    };
    const tokenService = {
      getTokenAddress: sinon.fake(() => 'TOKEN_ADDRESS')
    };
    const transferService = new TransferService(sdk as any, walletService as any, tokenService as any);
    return { sdk, walletService, tokenService, transferService };
  }

  it('can transfer ether', async () => {
    const {sdk, transferService, tokenService} = setup();

    await transferService.transfer({
      to: 'RECIPIENT',
      amount: '123',
      currency: ETHER_NATIVE_TOKEN.symbol
    });

    expect(tokenService.getTokenAddress).to.not.be.called;
    expect(sdk.execute).to.be.calledWith(
      {
        from: 'CONTRACT_ADDRESS',
        to: 'RECIPIENT',
        value: utils.parseEther('123'),
        data: '0x0',
        gasToken: ETHER_NATIVE_TOKEN.address
      },
      'PRIVATE_KEY',
    );
  });

  it('throw an error if wallet missing and transferring ETH', async () => {
    const {transferService, tokenService, walletService} = setup();
    walletService.userWallet = undefined;
    await expect(transferService.transfer({
      to: 'RECIPIENT',
      amount: '123',
      currency: ETHER_NATIVE_TOKEN.symbol
    })).to.be.rejectedWith('User wallet not found');
    expect(tokenService.getTokenAddress).to.not.be.called;
  });

  it('can transfer tokens', async () => {
    const {sdk, transferService, tokenService} = setup();
    const recipient = Wallet.createRandom().address;

    await transferService.transfer({
      to: recipient,
      amount: '123',
      currency: 'TOKEN_SYMBOL'
    });

    expect(tokenService.getTokenAddress).to.be.calledWith('TOKEN_SYMBOL');
    expect(sdk.execute).to.be.calledWith(
      {
        from: 'CONTRACT_ADDRESS',
        to: 'TOKEN_ADDRESS',
        value: 0,
        data: encodeTransfer(recipient, '123'),
        gasToken: 'TOKEN_ADDRESS'
      },
      'PRIVATE_KEY',
    );
  });

  it('throw an error if wallet is missing and transfering tokens', async () => {
    const {transferService, tokenService, walletService} = setup();
    walletService.userWallet = undefined;

    await expect(transferService.transfer({
      to: 'RECIPIENT',
      amount: '123',
      currency: 'TOKEN_SYMBOL'
    })).to.be.rejectedWith('User wallet not found');

    expect(tokenService.getTokenAddress).to.not.be.called;
  });

  it('throw an error if not enough tokens', async () => {
    const {transferService, sdk} = setup();
    sdk.execute = () => { throw new Error('Not enough tokens'); };
    await expect(transferService.transfer({
      to: 'RECIPIENT',
      amount: '123',
      currency: ETHER_NATIVE_TOKEN.symbol
    })).to.be.rejectedWith('Not enough tokens');
  });
});
