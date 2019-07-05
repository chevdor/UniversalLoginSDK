import {utils} from 'ethers';

import {CancelAuthorisationRequest} from '../models/authorisation';

export const hashCancelAuthorisationRequest =
  (cancelAuthorisationRequest: CancelAuthorisationRequest): string => {
    const payloadString = JSON.stringify(cancelAuthorisationRequest);
    const payloadBytes = utils.toUtf8Bytes(payloadString);
    return utils.keccak256(payloadBytes);
  };

export const signCancelAuthorisationRequest =
  (cancelAuthorisationRequest: CancelAuthorisationRequest, signingKey: utils.SigningKey): utils.Signature => {
    const payloadDigest = hashCancelAuthorisationRequest(cancelAuthorisationRequest);
    return signingKey.signDigest(payloadDigest);
  };

export const verifyCancelAuthroisationRequest =
  (payloadDigest: string, signature: utils.Signature, address: string): boolean => {
    const computedAddress = utils.recoverAddress(payloadDigest, signature);
    return computedAddress === address;
  };
