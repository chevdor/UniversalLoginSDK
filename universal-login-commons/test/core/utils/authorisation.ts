import {expect} from 'chai';
import {Wallet, utils} from 'ethers';
import {AddAuthorisationRequest} from '../../../lib/core/models/authorisation';
import {signAddAuthorisationRequest, verifyAddAuthroisationRequest} from '../../../lib/core/utils/authorisation';

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

  it('Sign authorisation request payload', async () => {
    const addAuthorisationRequest: AddAuthorisationRequest = {
      walletContractAddress: contractAddress,
      publicKey: address.toLowerCase()
    };
    const [payloadDigest, signature] = signAddAuthorisationRequest(addAuthorisationRequest, signingKey);
    expect(payloadDigest).to.equal(correctPayloadDigest);
    expect(signature).to.deep.equal(correctSignature);
  });

  it('Verify authorisation request payload', async () => {
    const result = verifyAddAuthroisationRequest(correctPayloadDigest, correctSignature, address);
    expect(result).to.deep.equal(true);
  });

  it('Forged signature', async () => {
    const attackerPrivateKey = '0x8e0f0ab35e7b8d8efc554fa0e9db29235e7c52ea5e2bb53ed50d24ff7a4a6f65';
    const attackerSigningKey = new utils.SigningKey(attackerPrivateKey);

    const addAuthorisationRequest: AddAuthorisationRequest = {
      walletContractAddress: contractAddress,
      publicKey: address.toLowerCase()
    };

    const [payloadDigest, forgedSignature] = signAddAuthorisationRequest(addAuthorisationRequest, attackerSigningKey);
    expect(payloadDigest).to.equal(correctPayloadDigest);
    expect(forgedSignature).to.not.deep.equal(correctSignature);
  });
});
