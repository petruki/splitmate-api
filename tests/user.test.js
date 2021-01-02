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

describe('Testing user', () => {

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

  test('USER - Should NOT get user data - Invalid token', async () => {
    await request(app)
      .get('/user/v1/me')
      .set('Authorization', 'Bearer INVALID_TOKEN')
      .send()
      .expect(401);
  });

  test('USER - Should get user data', async () => {
    //given
    const user1 = await User.findOne({ username: 'user1' });
    
    //test
    const response = await request(app)
      .get('/user/v1/me')
      .set('Authorization', `Bearer ${user1Token}`)
      .send()
      .expect(200);

    expect(String(response.body._id)).toEqual(String(user1._id));
  });

  test('USER - Should NOT find user - User does not exist', async () => {
    const response = await request(app)
      .get('/user/v1/find?username=NOT_EXIST')
      .set('Authorization', `Bearer ${user1Token}`)
      .send()
      .expect(200);

    expect(response.body).toEqual({});
  });

  test('USER - Should NOT find user - Invalid username', async () => {
    await request(app)
      .get('/user/v1/find?username=A')
      .set('Authorization', `Bearer ${user1Token}`)
      .send()
      .expect(422);
  });

  test('USER - Should find user', async () => {
    //given
    const user2 = await User.findOne({ username: 'user2' });
    
    //test
    const response = await request(app)
      .get(`/user/v1/find?username=${user2.username}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send()
      .expect(200);

    expect(String(response.body._id)).toEqual(String(user2._id));
  });

  test('USER - Should NOT delete user - Invalid token', async () => {
    await request(app)
      .delete('/user/v1/me')
      .set('Authorization', 'Bearer INVALID_TOKEN')
      .send()
      .expect(401);
  });

  test('USER - Should delete user', async () => {
    await request(app)
      .delete('/user/v1/me')
      .set('Authorization', `Bearer ${user1Token}`)
      .send()
      .expect(200);

    const user1 = await User.findOne({ username: 'user1' });
    expect(user1).toBe(null);
  });

});