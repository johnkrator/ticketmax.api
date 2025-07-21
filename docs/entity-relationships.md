# Entity Relationship Mapping - TicketMax Application

## Overview

This document maps the relationships between the core entities in the TicketMax application: Dashboard, User, Booking,
Payment, Event, and Organizer.

## Entity Relationship Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     USER        │    │   ORGANIZER     │    │     EVENT       │
│                 │    │                 │    │                 │
│ - id            │───▶│ - userId (FK)   │───▶│ - organizerId   │
│ - firstName     │    │ - personal...   │    │ - title         │
│ - lastName      │    │ - organization..│    │ - description   │
│ - email         │    │ - verification..│    │ - date/time     │
│ - role          │    │ - events[]      │    │ - location      │
│ - organizerId   │◀───│ - statistics    │    │ - totalTickets  │
│ - bookings[]    │    │                 │    │ - ticketsSold   │
│ - payments[]    │    └─────────────────┘    │ - createdBy     │
│ - createdEvents │                           │ - attendeeUsers │
│ - favoritedEvents│                          │ - favoritedBy   │
│ - attendingEvents│                          │                 │
└─────────────────┘                           └─────────────────┘
         │                                             │
         │                                             │
         ▼                                             ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│    BOOKING      │    │    PAYMENT      │    │   DASHBOARD     │
│                 │    │                 │    │   (Service)     │
│ - userId (FK)   │───▶│ - userId (FK)   │    │                 │
│ - eventId (FK)  │    │ - bookingId (FK)│◀───│ Aggregates:     │
│ - quantity      │───▶│ - amount        │    │ - User Stats    │
│ - totalAmount   │    │ - currency      │    │ - Event Stats   │
│ - status        │    │ - status        │    │ - Revenue Data  │
│ - ticketType    │    │ - paymentMethod │    │ - Analytics     │
│ - paymentId     │    │ - paidAt        │    │ - Activities    │
│ - qrCode        │    │ - gatewayFees   │    │                 │
│ - confirmedAt   │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## Detailed Relationships

### 1. USER Entity (Central Hub)

**Primary Relationships:**

- **One-to-One** with Organizer (optional): `User.organizerId ↔ Organizer.userId`
- **One-to-Many** with Bookings: `User.bookings[] ↔ Booking.userId`
- **One-to-Many** with Payments: `User.payments[] ↔ Payment.userId`
- **One-to-Many** with Events (as creator): `User.createdEvents[] ↔ Event.createdBy`
- **Many-to-Many** with Events (favorites): `User.favoritedEvents[] ↔ Event.favoritedBy[]`
- **Many-to-Many** with Events (attending): `User.attendingEvents[] ↔ Event.attendeeUsers[]`

### 2. ORGANIZER Entity

**Primary Relationships:**

- **One-to-One** with User: `Organizer.userId → User.id`
- **One-to-Many** with Events: `Organizer.events[] ↔ Event.organizerId`
- **Computed Statistics** from related bookings and payments

### 3. EVENT Entity

**Primary Relationships:**

- **Many-to-One** with Organizer: `Event.organizerId → Organizer.id`
- **Many-to-One** with User (creator): `Event.createdBy → User.id`
- **One-to-Many** with Bookings: `Event.id ↔ Booking.eventId`
- **Many-to-Many** with Users (attendees): `Event.attendeeUsers[] ↔ User.attendingEvents[]`
- **Many-to-Many** with Users (favorites): `Event.favoritedBy[] ↔ User.favoritedEvents[]`

### 4. BOOKING Entity (Transaction Hub)

**Primary Relationships:**

- **Many-to-One** with User: `Booking.userId → User.id`
- **Many-to-One** with Event: `Booking.eventId → Event.id`
- **One-to-One** with Payment: `Booking.paymentId ↔ Payment.bookingId`

### 5. PAYMENT Entity

**Primary Relationships:**

- **Many-to-One** with User: `Payment.userId → User.id`
- **One-to-One** with Booking: `Payment.bookingId → Booking.id`

### 6. DASHBOARD (Service Layer)

**Data Aggregation from:**

- **User Statistics**: ticket counts, event counts, activity feeds
- **Booking Analytics**: sales data, revenue, ticket distribution
- **Event Performance**: attendance, popularity, sales progress
- **Payment Metrics**: transaction volumes, success rates
- **Organizer Insights**: event performance, revenue analytics

## Key Features of the Relationship Design

### Referential Integrity

- **Mongoose References**: All foreign keys use `Types.ObjectId` with `ref` properties
- **Cascade Operations**: Middleware handles relationship maintenance on create/delete
- **Virtual Fields**: Computed properties for derived data

### Data Consistency

- **Pre-save Middleware**: Automatically updates relationship arrays
- **Index Optimization**: Strategic indexes on relationship fields
- **Transaction Support**: Ensures data integrity across related entities

### Dashboard Data Flow

```
User Request → Dashboard Service → Aggregation Queries → Multiple Collections
    ↓
User ← JSON Response ← Analytics/Stats ← Booking/Event/Payment Data
```

### Performance Optimizations

- **Pagination**: All relationship queries support pagination
- **Caching**: Dashboard service implements intelligent caching
- **Aggregation Pipelines**: Complex analytics use MongoDB aggregation
- **Selective Population**: Only load required relationship data

## Relationship Cardinalities Summary

| Entity A  | Relationship      | Entity B     | Cardinality   |
|-----------|-------------------|--------------|---------------|
| User      | organizer_profile | Organizer    | 1:0..1        |
| User      | bookings          | Booking      | 1:N           |
| User      | payments          | Payment      | 1:N           |
| User      | created_events    | Event        | 1:N           |
| User      | favorites         | Event        | N:M           |
| User      | attending         | Event        | N:M           |
| Organizer | events            | Event        | 1:N           |
| Event     | bookings          | Booking      | 1:N           |
| Booking   | payment           | Payment      | 1:1           |
| Dashboard | aggregates        | All Entities | Service Layer |

This relationship design provides a robust foundation for the TicketMax application, ensuring data integrity while
supporting complex analytics and real-time dashboard functionality.
