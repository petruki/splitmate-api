const { app } = require('../src/app');
const mongoose = require('mongoose');
const { Switcher } = require('switcher-client');
const request = require('supertest');

const restoreDb = require('./fixtures/restore-db');
const planFixture = require('./fixtures/plan.fixture');
const userFixture = require('./fixtures/user.fixture');
const { setupEventCollection, event1 } = require('./fixtures/event.fixture');
const { User } = require('../src/models');

beforeAll(() => Switcher.setTestEnabled());

afterAll(async () => {
  await restoreDb();
  await new Promise(resolve => setTimeout(resolve, 1000));
  await mongoose.disconnect();
});

describe('Testing event', () => {

  let users = [];
  let user1Token;
  
  const setupUsers = async () => {
    const user1 = await User.findOne({ username: 'user1' });
    user1.events_pending.push(event1._id);
    await user1.save();
  };

  beforeAll(async () => {
    await planFixture.setupDefaultPlan();
    users = await userFixture.setupUserCollection();
    await setupEventCollection();

    const response = await request(app)
      .post('/user/v1/login')
      .send({
          username: 'user1',
          password: '123'
      });

    user1Token = response.body.jwt.token;
    await setupUsers();
  });

  test('EVENT - Should create event', async () => {
    await request(app)
      .post('/event/v1/create')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        name: 'New Event',
        items: [{
          name: 'Beer'
        }]
      }).expect(201);
  });

  test('EVENT - Should NOT create event - Name lenght is lower than 2', async () => {
    await request(app)
      .post('/event/v1/create')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        name: 'N'
      }).expect(422);
  });

  test('EVENT - Should invite member to Event', async () => {
    // given
    // event created
    const response = await request(app)
      .post('/event/v1/create')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        name: 'New Event - Invite test',
      });

    // test
    await request(app)
      .post(`/event/v1/invite_all/${response.body._id}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        emails: [
          'user2@mail.com'
        ]
      }).expect(200);

    // test DB
    const user1 = userFixture.getUser(users, 'user2@mail.com');
    const user1Db = await User.findById(user1._id);
    expect(user1Db.events_pending.includes(String(response.body._id)));
  });

  test('EVENT - Should NOT invite member to Event - Event not found', async () => {
    await request(app)
      .post(`/event/v1/invite_all/${new mongoose.Types.ObjectId()}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        emails: [
          'user2@mail.com'
        ]
      }).expect(404);
  });

});