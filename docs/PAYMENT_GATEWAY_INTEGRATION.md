# Payment Gateway Integration - Paystack & Flutterwave

This document describes the dual payment gateway integration supporting both Paystack and Flutterwave payment providers.

## Overview

The TicketMax payment service now supports both Paystack and Flutterwave payment gateways, allowing users to choose
their preferred payment method. The system maintains backward compatibility with existing Paystack implementations while
adding comprehensive Flutterwave support.

## Configuration

### Environment Variables

Add the following environment variables to your `.env` file:

```env
# Paystack Configuration (existing)
PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxxxx
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxx
PAYSTACK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxx

# Flutterwave Configuration (new)
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-xxxxxxxxxxxxxxxxxx
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-xxxxxxxxxxxxxxxxxx
FLUTTERWAVE_WEBHOOK_SECRET=your_webhook_secret_hash

# Frontend URL for redirects
FRONTEND_URL=http://localhost:3000
```

### Webhook Configuration

#### Paystack Webhooks

- **URL**: `https://your-api-domain.com/payments/webhook/paystack`
- **Events**: `charge.success`, `charge.failed`
- **Header**: `x-paystack-signature`

#### Flutterwave Webhooks

- **URL**: `https://your-api-domain.com/payments/webhook/flutterwave`
- **Events**: `charge.completed`
- **Header**: `verif-hash`

## API Endpoints

### 1. Initiate Payment

**POST** `/payments/initiate`

Create a payment transaction for a booking.

```json
{
  "bookingId": "64a7b1c2d3e4f5g6h7i8j9k0",
  "customerEmail": "user@example.com",
  "customerName": "John Doe",
  "customerPhone": "+2348123456789",
  "gateway": "flutterwave",
  // optional, defaults to "paystack"
  "successUrl": "https://your-frontend.com/payment/success",
  "cancelUrl": "https://your-frontend.com/payment/cancel"
}
```

**Response:**

```json
{
  "authorization_url": "https://checkout.flutterwave.com/v3/hosted/pay/...",
  "reference": "FW_1690123456789_ABC123DEF456",
  "gateway": "flutterwave",
  "access_code": "rk_live_xxxxx"
  // Only for Paystack
}
```

### 2. Verify Payment

**GET** `/payments/verify/:reference`

Verify the status of a payment transaction.

```bash
GET /payments/verify/FW_1690123456789_ABC123DEF456
```

### 3. Payment History

**GET** `/payments/user/history?page=1&limit=10`

Get paginated payment history for the authenticated user.

### 4. Payment Statistics

**GET** `/payments/user/stats`

Get payment analytics for the authenticated user.

**Response:**

```json
{
  "totalPayments": 15,
  "totalSpent": 125000.00,
  "byStatus": {
    "success": {
      "count": 12,
      "amount": 120000.00
    },
    "failed": {
      "count": 2,
      "amount": 5000.00
    },
    "pending": {
      "count": 1,
      "amount": 0.00
    }
  }
}
```

### 5. Gateway Status

**GET** `/payments/gateways/status`

Check which payment gateways are available.

## Payment Flow

### Frontend Integration

```typescript
// Example: Initiating a payment
const initiatePayment = async (bookingId: string, gateway: 'paystack' | 'flutterwave' = 'paystack') => {
  try {
    const response = await fetch('/api/payments/initiate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${userToken}`
      },
      body: JSON.stringify({
        bookingId,
        customerEmail: user.email,
        customerName: user.name,
        customerPhone: user.phone,
        gateway,
        successUrl: `${window.location.origin}/payment/success`,
        cancelUrl: `${window.location.origin}/payment/cancel`
      })
    });

    const data = await response.json();

    // Redirect user to payment page
    window.location.href = data.authorization_url;
  } catch (error) {
    console.error('Payment initiation failed:', error);
  }
};
```

### Payment Verification (Frontend)

```typescript
// After user returns from payment gateway
const verifyPayment = async (reference: string) => {
  try {
    const response = await fetch(`/api/payments/verify/${reference}`, {
      headers: {
        'Authorization': `Bearer ${userToken}`
      }
    });

    const payment = await response.json();

    if (payment.status === 'success') {
      // Payment successful, redirect to success page
      router.push('/booking/success');
    } else {
      // Payment failed, show error message
      setError('Payment failed. Please try again.');
    }
  } catch (error) {
    console.error('Payment verification failed:', error);
  }
};
```

## Gateway-Specific Features

### Paystack Features

- **Payment Methods**: Card, Bank Transfer, USSD, QR Code, Mobile Money
- **Currency**: NGN (Nigerian Naira)
- **Fees**: Stored in `kobo` (1 Naira = 100 kobo)
- **Authorization Codes**: Supports recurring payments
- **Reference Format**: `PS_timestamp_randomstring`

### Flutterwave Features

- **Payment Methods**: Card, Bank Transfer, USSD, Mobile Money
- **Currency**: NGN (Nigerian Naira)
- **Fees**: Stored in `naira` then converted to kobo for consistency
- **Customizable UI**: Logo and branding support
- **Reference Format**: `FW_timestamp_randomstring`

## Database Schema

### Payment Entity Fields

```typescript
{
  // Common fields
  userId: ObjectId,
    bookingId
:
  ObjectId,
    amount
:
  number, // Always stored in kobo for consistency
    currency
:
  string, // 'NGN'
    status
:
  'pending' | 'success' | 'failed' | 'abandoned' | 'refunded',
    gateway
:
  'paystack' | 'flutterwave',

    // Paystack specific
    paystackReference ? : string,
    paystackTransactionId ? : string,
    paystackData ? : object,

    // Flutterwave specific
    flutterwaveReference ? : string,
    flutterwaveTransactionId ? : string,
    flutterwaveData ? : object,

    // Common payment details
    customerEmail
:
  string,
    customerName
:
  string,
    customerPhone ? : string,
    paymentMethod ? : string,
    paidAt ? : Date,
    authorizationCode ? : string,
    gatewayFees ? : number,
    failureReason ? : string,
    metadata ? : object
}
```

## Error Handling

The service includes comprehensive error handling:

- **Gateway Configuration**: Warns if gateway credentials are missing
- **Payment Validation**: Validates booking ownership and status
- **Webhook Security**: Verifies webhook signatures
- **Duplicate Payments**: Prevents multiple payments for same booking

## Testing

### Test Mode Configuration

Both gateways support test mode:

**Paystack Test Cards:**

```
Card Number: 4084084084084081
CVV: 408
Expiry: Any future date
PIN: 0000
OTP: 123456
```

**Flutterwave Test Cards:**

```
Card Number: 4187427415564246
CVV: 828
Expiry: 09/32
PIN: 3310
OTP: 12345
```

### Webhook Testing

Use tools like `ngrok` to expose local development server for webhook testing:

```bash
# Install ngrok
npm install -g ngrok

# Expose local server
ngrok http 3000

# Use the HTTPS URL for webhook configuration
```

## Migration from Paystack-only

Existing Paystack payments remain fully compatible. The new schema includes:

1. **Gateway field**: Defaults to 'paystack' for existing records
2. **Separate reference fields**: Maintains existing `paystackReference` field
3. **Backward compatibility**: All existing endpoints work unchanged

## Security Considerations

1. **Webhook Verification**: Both gateways use HMAC signature verification
2. **Environment Variables**: Store sensitive keys securely
3. **HTTPS Required**: Webhooks require HTTPS endpoints in production
4. **Rate Limiting**: Implement rate limiting on payment endpoints
5. **Input Validation**: All inputs are validated before processing

## Monitoring and Logging

The service includes comprehensive logging:

- Payment initiation attempts
- Gateway responses
- Webhook processing
- Payment status changes
- Error conditions

Monitor these logs for:

- Failed payment attempts
- Webhook delivery issues
- Gateway response times
- Error patterns

## Support

For gateway-specific issues:

- **Paystack**: https://paystack.com/docs
- **Flutterwave**: https://developer.flutterwave.com/docs

For implementation issues, check the service logs and ensure:

1. Environment variables are correctly configured
2. Webhook URLs are accessible
3. Test mode is properly configured for development
