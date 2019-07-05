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
    recoveryParam: 1,
    r: '0x88ef1df66d5755b4a936be18f3a6cd0aa36ffcb2066f12347f6c70bdee96bc28',
    s: '0x0014a8df6af34622c8df595a37dd7b1d6bb5124e6563ad8ecfdb7250cdbdc6e3',
    v: 28
  };
  const correctPayloadDigest = '0x01d663350574ac759a78f02cd4c0221e71382136bb96c4bc58ea182842e92a0e';

  it('Hash cancel authorisation request', async () => {
    const cancelAuthorisationRequest: CancelAuthorisationRequest = {
      walletContractAddress: contractAddress,
      publicKey: address.toLowerCase()
    };
    const payloadDigest = hashCancelAuthorisationRequest(cancelAuthorisationRequest);
    expect(payloadDigest).to.deep.equal(correctPayloadDigest);
  });

  it('Sign cancel authorisation request payload', async () => {
    const cancelAuthorisationRequest: CancelAuthorisationRequest = {
      walletContractAddress: contractAddress,
      publicKey: address.toLowerCase()
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
      publicKey: address.toLowerCase()
    };

    const forgedSignature = signCancelAuthorisationRequest(cancelAuthorisationRequest, attackerSigningKey);
    expect(forgedSignature).to.not.deep.equal(correctSignature);
  });
});
