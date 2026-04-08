import { body, query, validationResult } from 'express-validator';

export const bookingValidationRules = [
  body('guestName').notEmpty().withMessage('Guest name is required').trim(),
  body('contactNumber').notEmpty().withMessage('Contact number is required').trim(),
  body('email').isEmail().withMessage('Valid email is required').normalizeEmail(),
  body('tourType')
    .isIn(['day', 'night', 'overnight'])
    .withMessage('Tour type must be day, night, or overnight'),
  body('checkIn').isISO8601().withMessage('Check-in date is required'),
  body('checkOut').isISO8601().withMessage('Check-out date is required'),
  body('roomUnit')
    .isIn(['Kubo A', 'Kubo B', 'Kubo C', 'Kubo D', 'Villa 1', 'Villa 2'])
    .withMessage('Invalid room unit'),
  body('adults')
    .isInt({ min: 1 })
    .withMessage('At least 1 adult is required'),
  body('children')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Children count cannot be negative'),
  body('amount')
    .isFloat({ min: 0 })
    .withMessage('Amount must be a positive number'),
  body('paymentType')
    .isIn(['downpayment', 'full'])
    .withMessage('Payment type must be downpayment or full'),
];

export const conflictCheckRules = [
  query('roomUnit').notEmpty().withMessage('roomUnit is required'),
  query('checkIn').isISO8601().withMessage('checkIn must be a valid date'),
  query('checkOut').isISO8601().withMessage('checkOut must be a valid date'),
];

export function handleValidationErrors(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
}
