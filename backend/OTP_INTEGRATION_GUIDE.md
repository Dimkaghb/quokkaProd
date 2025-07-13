# OTP Email Verification Integration Guide

## Overview

The OTP (One-Time Password) email verification system has been successfully integrated into the QuokkaAI authentication system. This system provides secure email verification during user registration.

## New API Endpoints

### 1. Request OTP
**Endpoint:** `POST /auth/request-otp`

**Request Body:**
```json
{
    "email": "user@example.com",
    "name": "John Doe",
    "password": "securepassword123"
}
```

**Response:**
```json
{
    "message": "Verification code sent to your email",
    "email": "user@example.com"
}
```

### 2. Verify OTP
**Endpoint:** `POST /auth/verify-otp`

**Request Body:**
```json
{
    "email": "user@example.com",
    "otp_code": "123456"
}
```

**Response:**
```json
{
    "message": "Account created successfully",
    "user": {
        "id": "user-uuid",
        "name": "John Doe",
        "email": "user@example.com",
        "created_at": "2024-01-01T12:00:00Z",
        "is_active": true
    }
}
```

## Registration Flow

1. **User submits registration data** → `POST /auth/request-otp`
2. **System generates 6-digit OTP** and sends it via email
3. **User receives email** with verification code
4. **User enters OTP** → `POST /auth/verify-otp`
5. **System verifies OTP** and creates user account
6. **User can now login** → `POST /auth/login`

## Technical Implementation

### Files Modified/Created:

1. **`src/auth/models.py`** - Added OTP-related Pydantic models
2. **`src/auth/otp_service.py`** - New OTP service for email sending
3. **`src/auth/crud.py`** - Added OTP database operations
4. **`src/auth/database.py`** - Added OTP collection support
5. **`src/auth/settings.py`** - Added SMTP configuration
6. **`src/auth/api.py`** - Added OTP endpoints, modified registration

### Key Features:

- **6-digit OTP codes** generated randomly
- **1-minute expiration** for security
- **Automatic cleanup** of expired/used OTPs
- **Email delivery** via SMTP (Gmail)
- **Database storage** with MongoDB fallback to in-memory
- **Error handling** for invalid/expired codes

### Security Features:

- OTP codes expire after 1 minute
- OTPs are deleted after successful verification
- Duplicate OTP requests overwrite previous codes
- Email validation prevents spam
- Password hashing maintained

## Configuration

### Environment Variables (Optional):
```env
SMTP_USERNAME=quokkaAIapp@gmail.com
SMTP_PASSWORD=uiqm akkk ylbi aguw
FROM_EMAIL=quokkaAIapp@gmail.com
```

### Default Settings:
- SMTP Server: `smtp.gmail.com:587`
- OTP Length: 6 digits
- OTP Expiry: 1 minute
- Email Template: Professional QuokkaAI branding

## Error Handling

### Common Error Responses:

**Email Already Registered:**
```json
{
    "detail": "Email already registered"
}
```

**Invalid/Expired OTP:**
```json
{
    "detail": "Invalid or expired verification code"
}
```

**Email Send Failure:**
```json
{
    "detail": "Failed to send verification email"
}
```

## Frontend Integration

### Example Frontend Flow:

```javascript
// Step 1: Request OTP
const requestOTP = async (userData) => {
    const response = await fetch('/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
    });
    return response.json();
};

// Step 2: Verify OTP
const verifyOTP = async (email, otpCode) => {
    const response = await fetch('/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp_code: otpCode })
    });
    return response.json();
};
```

## Testing

The system has been tested with:
- ✅ OTP generation and storage
- ✅ Email sending (SMTP)
- ✅ OTP verification (correct codes)
- ✅ OTP rejection (wrong codes)
- ✅ Expiration handling
- ✅ Database operations (MongoDB + in-memory)

## Migration Notes

- **Legacy `/auth/signup`** endpoint now redirects to OTP flow
- **Existing users** are unaffected
- **Backward compatibility** maintained for login
- **No database migrations** required

## Monitoring

### Log Messages:
- `OTP request for email: user@example.com`
- `OTP sent successfully to user@example.com`
- `OTP verification attempt for email: user@example.com`
- `User created successfully after OTP verification: user@example.com`

### Database Collections:
- `users` - User accounts
- `otps` - Temporary OTP records (auto-cleaned)

## Troubleshooting

### Common Issues:

1. **Email not received**: Check SMTP credentials and spam folder
2. **OTP expired**: Request new OTP (previous codes are invalidated)
3. **Database errors**: System falls back to in-memory storage
4. **SMTP errors**: Check network connectivity and credentials

### Debug Commands:
```bash
# Check OTP service import
python -c "from src.auth.otp_service import otp_service; print('OK')"

# Test database connection
python -c "import asyncio; from src.auth.database import connect_to_mongo; asyncio.run(connect_to_mongo())"
``` 