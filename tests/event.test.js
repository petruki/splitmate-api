const { app } = require('../src/app');
const mongoose = require('mongoose');
const Switcher = require('switcher-client');
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

  let user1Token;
  
  const setupUser = async () => {
    const user1 = await User.findOne({ username: 'user1' });
    user1.events_pending.push(event1._id);
    await user1.save();
  };

  beforeAll(async () => {
    await planFixture.setupDefaultPlan();
    await userFixture.setupUserCollection();
    await setupEventCollection();

    const response = await request(app)
      .post('/user/v1/login')
      .send({
          username: 'user1',
          password: '123'
      });

    user1Token = response.body.jwt.token;
    await setupUser();
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

  test('EVENT - Should NOT create event - Limit exceeded', async () => {
    await request(app)
      .post('/event/v1/create')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        name: 'New Event 1',
        items: [{
          name: 'Beer'
        }]
      }).expect(201);

    await request(app)
      .post('/event/v1/create')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        name: 'New Event 2',
        items: [{
          name: 'Beer'
        }]
      }).expect(400);
  });

  test('EVENT - Should NOT create event - Name lenght is lower than 2', async () => {
    await request(app)
      .post('/event/v1/create')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        name: 'N'
      }).expect(422);
  });

});