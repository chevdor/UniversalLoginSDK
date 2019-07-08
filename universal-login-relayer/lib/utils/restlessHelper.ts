import { Sanitizer, Either, asObject, asOptional, asNumber, asString } from '@restless/restless';
import {TransactionOverrides} from '@universal-login/commons';
import { utils } from 'ethers';
import { Signature } from 'ethers/utils';

export const asBigNumberish: Sanitizer<utils.BigNumber> = (value, path) => {
  if (typeof value === 'string' || typeof value === 'number') {
    try {
      const bigNumber = utils.bigNumberify(value);
      return Either.right(bigNumber);
    } catch {
      return Either.left([{ path, expected: 'bigNumber' }]);
    }
  }
  return Either.left([{ path, expected: 'bigNumber' }]);
};

export const asArrayish: Sanitizer<string | number[]> = (value, path) => {
  if (typeof value === 'string') {
    return Either.right(value);
  } else if (Array.isArray(value)) {
    return Either.right(value);
  } else {
    return Either.left([{ path, expected: 'arrayish' }]);
  }
};

// There exists Signature type from ethers (bytes.d.ts)
// todo regex type /0x([a-zA-Z0-9]){64}/
// type signature = {recoveryParam: 0 | 1, r: string, s: string, v: 27 | 28}; <- stornger than utils.Signature
export interface MySignature {
  r: string;
  s: string;
  recoveryParam: number;
  v: number;
}
export const asSignature: Sanitizer<MySignature> = asObject({
  recoveryParam: asNumber,
  r: asString,
  s: asString,
  v: asNumber
});

export const asOverrideOptions: Sanitizer<TransactionOverrides> = asObject({
  gasLimit: asOptional(asBigNumberish),
  gasPrice: asOptional(asBigNumberish)
});

export const asAny = (value: any) => Either.right(value);
