// MongoDB initialization script
db = db.getSiblingDB('ticketmax');

// Create application user
db.createUser({
  user: 'ticketmax',
  pwd: 'ticketmax123',
  roles: [
    {
      role: 'readWrite',
      db: 'ticketmax',
    },
  ],
});

// Create indexes for better performance
db.users.createIndex({ email: 1 }, { unique: true });
db.events.createIndex({ category: 1 });
db.events.createIndex({ date: 1 });
db.events.createIndex({ location: 1 });
db.bookings.createIndex({ userId: 1 });
db.bookings.createIndex({ eventId: 1 });
db.organizers.createIndex({ email: 1 }, { unique: true });

print('Database initialized successfully');
