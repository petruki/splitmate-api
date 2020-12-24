const { app } = require('../src/app');
const mongoose = require('mongoose');
const Switcher = require('switcher-client');
const request = require('supertest');

const planFixture = require('./fixtures/plan.fixture');
const userFixture = require('./fixtures/user.fixture');
const { setupEventCollection, event1 } = require('./fixtures/event.fixture');
const { User } = require('../src/models');

beforeAll(() => Switcher.setTestEnabled());

afterAll(async () => {
  await new Promise(resolve => setTimeout(resolve, 1000));
  await mongoose.disconnect();
});

describe('Testing user joining/leaving event', () => {

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

  test('USER - Should NOT join Event - Invalid eventId', async () => {
    await request(app)
      .post('/user/v1/event/join?eventid=INVALID_ID')
      .set('Authorization', `Bearer ${user1Token}`)
      .send()
      .expect(422);
  });

  test('USER - Should NOT join Event - Event not found', async () => {
    await request(app)
    .post(`/user/v1/event/join?eventid=${new mongoose.Types.ObjectId()}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send()
      .expect(404);
  });

  test('USER - Should join Event', async () => {
    await request(app)
      .post(`/user/v1/event/join?eventid=${event1._id}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send()
      .expect(200);
  });

  test('USER - Should NOT join Event - User already joined', async () => {
    await request(app)
      .post(`/user/v1/event/join?eventid=${event1._id}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send()
      .expect(400);
  });

  test('USER - Should NOT leave Event - Invalid eventId', async () => {
    await request(app)
      .post('/user/v1/event/leave?eventid=INVALID_ID')
      .set('Authorization', `Bearer ${user1Token}`)
      .send()
      .expect(422);
  });

  test('USER - Should leave Event', async () => {
    await request(app)
      .post(`/user/v1/event/leave?eventid=${event1._id}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send()
      .expect(200);
  });

});

describe('Testing user dismiss event', () => {

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

  test('USER - Should NOT dismiss Event - Invalid eventId', async () => {
    await request(app)
      .post('/user/v1/event/dismiss?eventid=INVALID_ID')
      .set('Authorization', `Bearer ${user1Token}`)
      .send()
      .expect(422);
  });

  test('USER - Should NOT dismiss Event - Event not found', async () => {
    //given
    const user = await User.findOne({ username: 'user1' });
    expect(user.events_pending.length).toBe(1);

    //test
    const response = await request(app)
      .post(`/user/v1/event/dismiss?eventid=${event1._id}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send()
      .expect(200);

    expect(response.body.events_pending).toEqual([]);
  });

});

describe('Testing user being removed from Event', () => {

  let user1Token;
  let users;
  
  const setupEvent = async () => {
    users = await User.find({ username: ['user1', 'user2'] });
    users.forEach(user => event1.members.push(user._id));
    await event1.save();
  };

  beforeAll(async () => {
    await userFixture.setupUserCollection();
    await setupEventCollection();

    const response = await request(app)
      .post('/user/v1/login')
      .send({
          username: 'user1',
          password: '123'
      });

    user1Token = response.body.jwt.token;
    await setupEvent();
  });

  test('USER - Should NOT remove member from Event - Event not found', async () => {
    await request(app)
      .post(`/user/v1/event/${users[1]._id}/remove?eventid=${new mongoose.Types.ObjectId()}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send()
      .expect(404);
  });

  test('USER - Should NOT remove member from Event - Member not found', async () => {
    await request(app)
      .post(`/user/v1/event/${new mongoose.Types.ObjectId()}/remove?eventid=${event1._id}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send()
      .expect(404);
  });

  test('USER - Should NOT remove member from Event - Invalid member id', async () => {
    await request(app)
      .post(`/user/v1/event/INVALID_ID/remove?eventid=${event1._id}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send()
      .expect(422);
  });

  test('USER - Should remove member from Event', async () => {
    await request(app)
      .post(`/user/v1/event/${users[1]._id}/remove?eventid=${event1._id}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send()
      .expect(200);
  });

});

describe('Testing user moving event/archive', () => {

  let user1Token;

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
  });

  test('USER - Should NOT move Event to Archive - Evenot not found', async () => {
    await request(app)
      .post(`/user/v1/event/add/archive?eventid=${new mongoose.Types.ObjectId()}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send()
      .expect(404);
  });

  test('USER - Should NOT move Event to Archive - Invalid eventId', async () => {
    await request(app)
      .post('/user/v1/event/add/archive?eventid=INVALID_ID')
      .set('Authorization', `Bearer ${user1Token}`)
      .send()
      .expect(422);
  });

  test('USER - Should NOT move Event to Archive - Invalid command', async () => {
    await request(app)
      .post(`/user/v1/event/INVALID/archive?eventid=${event1._id}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send()
      .expect(400);
  });

  test('USER - Should move Event to Archive', async () => {
    //given
    const user = await User.findOne({ username: 'user1' });
    expect(user.events_archived.length).toEqual(0);

    //test
    const response = await request(app)
      .post(`/user/v1/event/add/archive?eventid=${event1._id}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send()
      .expect(200);

    expect(String(response.body.events_archived[0])).toEqual(String(event1._id));
  });

  test('USER - Should remove Event from Archive', async () => {
    //given
    const user = await User.findOne({ username: 'user1' });
    expect(String(user.events_archived)).toEqual(String(event1._id));

    //test
    const response = await request(app)
      .post(`/user/v1/event/remove/archive?eventid=${event1._id}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send()
      .expect(200);

    expect(response.body.events_archived.length).toEqual(0);
  });

});