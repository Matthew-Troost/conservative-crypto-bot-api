require("dotenv/config");
const express = require("express");
const http = require("http");
const jwt = require("jsonwebtoken");
const DataLoader = require("dataloader");
const { ApolloServer, AuthenticationError } = require("apollo-server-express");
const schema = require("./graphql/schema");
const resolvers = require("./graphql/resolvers");
const { models, sequelize } = require("./models");
const loaders = require("./graphql/loaders");

const app = express();

const getMe = async (req) => {
  const token = req.headers["x-token"];
  if (token) {
    try {
      return await jwt.verify(token, process.env.SECRET);
    } catch (e) {
      //commented this out as it would throw an error for unauth queries if token had expired
      //throw new AuthenticationError("Your session expired. Sign in again.");
    }
  }
};

const server = new ApolloServer({
  introspection: true,
  playground: true,
  typeDefs: schema,
  resolvers,
  formatError: (error) => {
    // remove the internal sequelize error message
    // leave only the important validation error
    const message = error.message
      .replace("SequelizeValidationError: ", "")
      .replace("Validation error: ", "");
    return {
      ...error,
      message,
    };
  },
  context: async ({ req, connection }) => {
    // this function is hit everytime a request is made to the server
    let all_loaders = {
      pricePoint: new DataLoader((keys) =>
        loaders.batchPricePoints(keys, models)
      ),
      user: new DataLoader((keys) => loaders.batchUsers(keys, models)),
      profile: new DataLoader((keys) => loaders.batchProfiles(keys, models)),
      entry: new DataLoader((keys) => loaders.batchEntries(keys, models)),
    };

    if (connection) {
      return {
        models,
        loaders: all_loaders,
      };
    }

    if (req) {
      const me = await getMe(req); // this still allows request with no token. Only throws error if token is invalid or expired
      return {
        models,
        me,
        secret: process.env.SECRET,
        loaders: all_loaders,
      };
    }
  },
});

server.applyMiddleware({ app, path: "/graphql" });

const httpServer = http.createServer(app);
server.installSubscriptionHandlers(httpServer);

const isTest = !!process.env.TEST_DATABASE;

const port = process.env.PORT || 8000; //heroku environment variable (merged on deploy)

sequelize.sync({ force: isTest }).then(async () => {
  if (isTest) {
    seedDatabase();
  }

  httpServer.listen({ port }, () => {
    console.log(
      `Apollo Server on http://localhost:${isTest ? "5432" : "8000"}/graphql`
    );
  });
});

const seedDatabase = async () => {
  await models.User.create({
    username: "rwieruch",
    email: "hello@robin.com",
    password: "rwieruch",
    role: "ADMIN",
  });
  await models.User.create({
    username: "ddavids",
    email: "hello@david.com",
    password: "ddavids",
  });
};
