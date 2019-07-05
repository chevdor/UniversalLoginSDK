import {expect} from 'chai';
import {utils} from 'ethers';
import {CancelAuthorisationRequest} from '../../../lib/core/models/authorisation';
import {signCancelAuthorisationRequest, verifyCancelAuthroisationRequest, hashCancelAuthorisationRequest} from '../../../lib/core/utils/authorisation';

describe('authorization sign verify', async () => {
  const contractAddress: string = '0x14791697260E4c9A71f18484C9f997B308e59325';
  const privateKey = '0x9e0f0ab35e7b8d8efc554fa0e9db29235e7c52ea5e2bb53ed50d24ff7a4a6f65';
  const address = '0xa67131F4640294a209fdFF9Ad15a409D22EEB3Dd';
  const signingKey = new utils.SigningKey(privateKey);
  const correctSignature: utils.Signature = {
    recoveryParam: 0,
    r: '0xdd1c5bb451c189ec5ccffd371337c454c69d2be961f319ac3c836ea9d314a4c4',
    s: '0x37788faa6e8962205f1ab26a71c78eb64de72e9d34e9a764c437da9021e281e0',
    v: 27
  };
  const correctPayloadDigest = '0x8d960282a020a83c5b5006719b18f72ffab4ef7a4b2356aa623652da1b2e42e1';

  it('Hash cancel authorisation request', async () => {
    const cancelAuthorisationRequest: CancelAuthorisationRequest = {
      walletContractAddress: contractAddress,
      body: {
        key: address.toLowerCase()
      }
    };
    const payloadDigest = hashCancelAuthorisationRequest(cancelAuthorisationRequest);
    expect(payloadDigest).to.equal(correctPayloadDigest);
  });

  it('Sign cancel authorisation request payload', async () => {
    const cancelAuthorisationRequest: CancelAuthorisationRequest = {
      walletContractAddress: contractAddress,
      body: {
        key: address.toLowerCase()
      }
    };
    const signature = signCancelAuthorisationRequest(cancelAuthorisationRequest, signingKey);
    expect(signature).to.deep.equal(correctSignature);
  });

  it('Verify cancel authorisation request payload', async () => {
    const result = verifyCancelAuthroisationRequest(correctPayloadDigest, correctSignature, address);
    expect(result).to.deep.equal(true);
  });

  it('Forged signature', async () => {
    const attackerPrivateKey = '0x8e0f0ab35e7b8d8efc554fa0e9db29235e7c52ea5e2bb53ed50d24ff7a4a6f65';
    const attackerSigningKey = new utils.SigningKey(attackerPrivateKey);

    const cancelAuthorisationRequest: CancelAuthorisationRequest = {
      walletContractAddress: contractAddress,
      body: {
        key: address.toLowerCase()
      }
    };

    const forgedSignature = signCancelAuthorisationRequest(cancelAuthorisationRequest, attackerSigningKey);
    expect(forgedSignature).to.not.deep.equal(correctSignature);
  });
});
