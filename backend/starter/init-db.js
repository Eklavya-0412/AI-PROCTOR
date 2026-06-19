// Initialize MongoDB database with collections and indexes
db = db.getSiblingDB('proctor');

// Create users collection with schema validation
db.createCollection('users', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['name', 'email', 'hashed_password', 'created'],
      properties: {
        _id: { bsonType: 'objectId' },
        name: { bsonType: 'string' },
        email: { bsonType: 'string' },
        hashed_password: { bsonType: 'binData' },
        created: { bsonType: 'date' }
      }
    }
  }
});

// Create unique index on email
db.users.createIndex({ email: 1 }, { unique: true });

// Create sessions collection
db.createCollection('sessions', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['token', 'data', 'expiry'],
      properties: {
        _id: { bsonType: 'objectId' },
        token: { bsonType: 'string' },
        data: { bsonType: 'binData' },
        expiry: { bsonType: 'date' }
      }
    }
  }
});

// Create index on token for fast lookups
db.sessions.createIndex({ token: 1 }, { unique: true });

// Create TTL index to auto-delete expired sessions
db.sessions.createIndex({ expiry: 1 }, { expireAfterSeconds: 0 });

// Create snippets collection for future use
db.createCollection('snippets', {
  validator: {
    $jsonSchema: {
      bsonType: 'object',
      required: ['user_id', 'title', 'created'],
      properties: {
        _id: { bsonType: 'objectId' },
        user_id: { bsonType: 'objectId' },
        title: { bsonType: 'string' },
        created: { bsonType: 'date' }
      }
    }
  }
});

db.snippets.createIndex({ user_id: 1 });
