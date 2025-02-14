import {expect} from 'chai';
import {utils} from 'ethers';
import {getKnex} from '../../../../lib/core/utils/knexUtils';
import MessageQueueStore from '../../../../lib/integration/sql/services/MessageQueueSQLStore';
import {SignedMessage, calculateMessageHash, TEST_TRANSACTION_HASH} from '@universal-login/commons';
import {getTestSignedMessage} from '../../../config/message';
import MessageQueueMemoryStore from '../../../helpers/MessageQueueMemoryStore';
import IMessageQueueStore from '../../../../lib/core/services/messages/IMessageQueueStore';
import { clearDatabase } from '../../../../lib/http/relayers/RelayerUnderTest';

for (const config of [{
  name: 'MessageQueueSQLStore',
  type: MessageQueueStore,
}, {
  type: MessageQueueMemoryStore,
  name: 'MessageQueueMemoryStore',
}]
) {
describe(`INT: IMessageQueueStore: ${config.name}`, async () => {
  let messageQueueStore: IMessageQueueStore;
  let signedMessage: SignedMessage;
  let expectedMessageHash: string;
  const knex = getKnex();

  before(async () => {
    signedMessage = await getTestSignedMessage();
    expectedMessageHash = calculateMessageHash(signedMessage);
  });

  beforeEach(async () => {
    let args: any;
    if (config.name.includes('SQL')) {
      args = knex;
    }
    messageQueueStore = new config.type(args);
  });

  it('construction: queue is empty', async () =>  {
    const nextTransaction = await messageQueueStore.getNext();
    expect(nextTransaction).to.be.undefined;
  });

  it('add message', async () =>  {
    const messageHash = await messageQueueStore.add(signedMessage);
    expect(messageHash).to.be.a('string');
    expect(messageHash).to.be.eq(expectedMessageHash);
  });

  it('get message', async () => {
    const messageHash = await messageQueueStore.add(signedMessage);
    const messageEntity = await messageQueueStore.get(messageHash);
    expect(messageEntity!.message.gasLimit.toString()).to.deep.eq(signedMessage.gasLimit);
    expect(messageEntity!.message.gasPrice.toString()).to.deep.eq(signedMessage.gasPrice);
    expect(messageEntity!.message.value.toString()).to.deep.eq(signedMessage.value);
    expect(messageEntity!.message.gasToken).to.deep.eq(signedMessage.gasToken);
    expect(messageEntity!.message.data).to.deep.eq(signedMessage.data);
    expect(messageEntity!.message.from).to.deep.eq(signedMessage.from);
    expect(messageEntity!.message.to).to.deep.eq(signedMessage.to);
    expect(messageEntity!.message.signature).to.deep.eq(signedMessage.signature);
  });

  it('message round trip', async () => {
    const messageHash1 = await messageQueueStore.add(signedMessage);
    const signedMessage2 = await getTestSignedMessage({value: utils.parseEther('2')});
    const messageHash2 = await messageQueueStore.add(signedMessage2);
    const nextMessageHash = (await messageQueueStore.getNext())!.messageHash;
    expect(nextMessageHash).to.be.equal(messageHash1);
    expect(nextMessageHash).to.be.eq(expectedMessageHash);
    await messageQueueStore.markAsSuccess(messageHash1, TEST_TRANSACTION_HASH);
    const nextMessageHash2 = (await messageQueueStore.getNext())!.messageHash;
    expect(nextMessageHash2).to.be.equal(messageHash2);
    expect(nextMessageHash2).to.be.eq(calculateMessageHash(signedMessage2));
    await messageQueueStore.markAsSuccess(messageHash2, TEST_TRANSACTION_HASH);
    expect(await messageQueueStore.getNext()).to.be.undefined;
  });

  afterEach(async () => {
    config.name.includes('SQL') && await clearDatabase(knex);
  });

  after(async () => {
    await knex.destroy();
  });
});
}
