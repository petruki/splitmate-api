const { app } = require('../src/app');
const mongoose = require('mongoose');
const { Switcher } = require('switcher-client');
const request = require('supertest');
const sinon = require('sinon');
const axios = require('axios');

const restoreDb = require('./fixtures/restore-db');
const planFixture = require('./fixtures/plan.fixture');
const userFixture = require('./fixtures/user.fixture');
var sandbox;

beforeAll(() => Switcher.setTestEnabled());

afterAll(async () => {
  await restoreDb();
  await new Promise(resolve => setTimeout(resolve, 1000));
  await mongoose.disconnect();
});

beforeEach(function () {
  sandbox = sinon.createSandbox();
});

afterEach(function () {
  sandbox.restore();
});

describe('Testing user signup/signin', () => {

  let axiosPostStub;

  beforeAll(async () => {
    await planFixture.setupDefaultPlan();
    await userFixture.setupUserCollection();
  });

  test('USER - Should NOT sign up - Bad Request', async () => {
    //no username
    await request(app)
      .post('/user/v1/signup')
      .send({
          name: 'Test',
          email: 'test@mail.com',
          password: '123',
          token: 'GOOGLE_RECAPTCHA_TOKEN'
      }).expect(422);

    //no password length less than 3 characters
    await request(app)
    .post('/user/v1/signup')
    .send({
        name: 'Test',
        username: 'test',
        email: 'test@mail.com',
        password: '12',
        token: 'GOOGLE_RECAPTCHA_TOKEN'
    }).expect(422);
  });

  test('USER - Should NOT sign up - Token not provided', async () => {
    // mock
    axiosPostStub = sandbox.stub(axios, 'post');

    // given
    const mockedRecaptchaResponse = { data: { success: false } };
    axiosPostStub.returns(Promise.resolve(mockedRecaptchaResponse));

    // test
    const response = await request(app)
      .post('/user/v1/signup')
      .send({
          name: 'Test',
          username: 'test',
          email: 'test@mail.com',
          password: '123'
      }).expect(500);

    expect(response.body.error).toEqual('Token is empty or invalid');
  });

  test('USER - Should NOT sign up - SignUp not available', async () => {
    // mock
    axiosPostStub = sandbox.stub(axios, 'post');

    // given
    const mockedRecaptchaResponse = { data: { success: true } };
    axiosPostStub.returns(Promise.resolve(mockedRecaptchaResponse));
    Switcher.assume('SIGNUP').false();

    // test
    const response = await request(app)
      .post('/user/v1/signup')
      .send({
          name: 'Test',
          username: 'test',
          email: 'test@mail.com',
          password: '123',
          token: 'GOOGLE_RECAPTCHA_TOKEN'
      }).expect(500);

    expect(response.body.error).toEqual('Email test@mail.com not allowed');

    Switcher.forget('SIGNUP');
  });

  test('USER - Should sign up', async () => {
    // mock
    axiosPostStub = sandbox.stub(axios, 'post');

    // given
    const mockedRecaptchaResponse = { data: { success: true } };
    axiosPostStub.returns(Promise.resolve(mockedRecaptchaResponse));

    // test
    await request(app)
      .post('/user/v1/signup')
      .send({
          name: 'Test',
          username: 'test',
          email: 'test@mail.com',
          password: '123',
          token: 'GOOGLE_RECAPTCHA_TOKEN'
      }).expect(201);
  });

  test('USER - Should NOT sign in - Invalid login', async () => {
    await request(app)
      .post('/user/v1/login')
      .send({
          username: 'invalid',
          password: '123'
      }).expect(401);
  });

  test('USER - Should sign in', async () => {
    await request(app)
      .post('/user/v1/login')
      .send({
          username: 'test',
          password: '123'
      }).expect(200);
  });

});