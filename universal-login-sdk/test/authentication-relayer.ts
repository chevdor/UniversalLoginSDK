import {expect} from 'chai';
import {Wallet, utils} from 'ethers';
import {createFixtureLoader} from 'ethereum-waffle';
import basicSDK from './fixtures/basicSDK';
import UniversalLoginSDK from '../lib/sdk';
import { CancelAuthorisationRequest } from '@universal-login/commons/lib';

const loadFixture = createFixtureLoader();
const jsonRpcUrl = 'http://localhost:18545';

describe('E2E authorization - sdk <=> relayer', async () => {
  let provider: any;
  let relayer: any;
  let sdk: UniversalLoginSDK;
  let contractAddress: any;
  let privateKey: any;
  let walletContract: any;

  beforeEach(async () => {
    ({provider, sdk, privateKey, contractAddress, walletContract, relayer} = await loadFixture(basicSDK));  });

  afterEach(async () => {
    await relayer.clearDatabase();
  });

  it('Send unsigned request', async () => {
    const userAddress = utils.computeAddress(privateKey);
    await expect(sdk.denyRequest(contractAddress, userAddress)).to.be.eventually.rejected;
  });

  it('Sign authorisation request payload', async () => {
    // await expect(sdk.relayerApi (contractAddress)).to.be.eventually.rejected;
  });

  after(async () => {
    await relayer.stop();
  });
});
