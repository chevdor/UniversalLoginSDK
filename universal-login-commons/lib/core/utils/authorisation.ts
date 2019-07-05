import {utils} from 'ethers';

import {AddAuthorisationRequest} from '../models/authorisation';

export const signAddAuthorisationRequest =
  (addAuthorisationRequest: AddAuthorisationRequest, signingKey: utils.SigningKey): [string, utils.Signature] => {
    const payloadString = JSON.stringify(addAuthorisationRequest);
    const payloadBytes = utils.toUtf8Bytes(payloadString);
    const payloadDigest = utils.keccak256(payloadBytes);
    return [payloadDigest, signingKey.signDigest(payloadDigest)];
  };

export const verifyAddAuthroisationRequest =
  (payloadDigest: string, signature: utils.Signature, address: string): boolean => {
    const computedAddress = utils.recoverAddress(payloadDigest, signature);
    return computedAddress === address;
  };
