const { gql } = require('apollo-server-express');

const userSchema = require('./user');
const pricePointSchema = require('./pricepoint');
const eventSchema = require('./event');
const stateSchema = require('./state');
const profileSchema = require('./profile');
const entrySchema = require('./entry');
const exitSchema = require('./exit');

const linkSchema = gql`
  scalar Date

  type Query {
    _: Boolean
  }
  type Mutation {
    _: Boolean
  }
  type Subscription {
    _: Boolean
  }
`;
module.exports = [linkSchema, userSchema, pricePointSchema, eventSchema, stateSchema, profileSchema, entrySchema, exitSchema];