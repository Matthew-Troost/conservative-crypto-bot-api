const { combineResolvers } = require("graphql-resolvers");
const { isAuthenticated } = require("./authorization");
const { pubsub, EVENTS } = require("../subscriptions");
const Sequelize = require('sequelize');

// resolver map
// each resolver has 4 arguments (parent, args, context, info).
// Can inject dependencies for the resolver via context
const resolvers = {
  Query: {
    events: async (parent, { minimumDate, limit = 5 }, { models }) => {
      const options = minimumDate
        ? {
            where: {
              createdAt: {
                [Sequelize.Op.gt]: minimumDate,
              },
            },
          }
        : {};

      return await models.Event.findAll({
        order: [["createdAt", "DESC"]],
        limit,
        options
      });
    },
  },
  Mutation: {
    createEvent: combineResolvers(
      isAuthenticated,
      async (parent, { type, pricepointId }, { models }) => {
        const event = await models.Event.create({
          type,
          pricepointId,
        });

        pubsub.publish(EVENTS.EVENT.CREATED, {
          eventCreated: { event },
        });

        return event;
      }
    ),
  },
  Subscription: {
    eventCreated: {
      subscribe: () => pubsub.asyncIterator(EVENTS.EVENT.CREATED),
    },
  },

  // field level resolvers
  Event: {
    pricePoint: async (event, args, { loaders }) =>
      await loaders.pricePoint.load(event.pricepointId),
  },
};

module.exports = resolvers;
