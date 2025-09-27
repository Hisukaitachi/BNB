const { Joi } = require('../middleware/validation');

const createReservationSchema = Joi.object({
    listing_id: Joi.number().integer().positive().required()
        .messages({
            'number.base': 'Listing ID must be a number',
            'number.positive': 'Invalid listing ID',
            'any.required': 'Listing is required'
        }),
    
    check_in_date: Joi.date()
        .min('now')
        .required()
        .messages({
            'date.min': 'Check-in date cannot be in the past',
            'any.required': 'Check-in date is required'
        }),
    
    check_out_date: Joi.date()
        .greater(Joi.ref('check_in_date'))
        .required()
        .messages({
            'date.greater': 'Check-out must be after check-in',
            'any.required': 'Check-out date is required'
        }),
    
    guest_count: Joi.number()
        .integer()
        .min(1)
        .max(20)
        .required()
        .messages({
            'number.min': 'At least 1 guest is required',
            'number.max': 'Maximum 20 guests allowed',
            'any.required': 'Number of guests is required'
        }),
    
    guest_name: Joi.string()
        .trim()
        .min(2)
        .max(100)
        .required()
        .messages({
            'string.min': 'Name must be at least 2 characters',
            'string.max': 'Name cannot exceed 100 characters',
            'any.required': 'Guest name is required'
        }),
    
    guest_email: Joi.string()
        .email()
        .required()
        .messages({
            'string.email': 'Valid email is required',
            'any.required': 'Email is required'
        }),
    
    guest_phone: Joi.string()
        .pattern(/^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/)
        .optional()
        .messages({
            'string.pattern.base': 'Invalid phone number format'
        }),
    
    special_requests: Joi.string()
        .max(1000)
        .optional()
        .messages({
            'string.max': 'Special requests cannot exceed 1000 characters'
        }),
    
    total_amount: Joi.number()
        .positive()
        .precision(2)
        .required()
        .messages({
            'number.positive': 'Total amount must be positive',
            'any.required': 'Total amount is required'
        }),
    
    paymentMethod: Joi.string()
        .valid('deposit', 'full')
        .default('deposit')
        .messages({
            'any.only': 'Payment method must be deposit or full'
        })
});

const hostActionSchema = Joi.object({
    id: Joi.string().pattern(/^\d+$/).required(),
    action: Joi.string()
        .valid('approve', 'decline')
        .required()
        .messages({
            'any.only': 'Action must be approve or decline',
            'any.required': 'Action is required'
        }),
    reason: Joi.string()
        .max(500)
        .when('action', {
            is: 'decline',
            then: Joi.required(),
            otherwise: Joi.optional()
        })
        .messages({
            'any.required': 'Reason is required when declining',
            'string.max': 'Reason cannot exceed 500 characters'
        })
});

const cancelReservationSchema = Joi.object({
    id: Joi.string().pattern(/^\d+$/).required(),
    reason: Joi.string()
        .max(500)
        .optional()
        .messages({
            'string.max': 'Reason cannot exceed 500 characters'
        })
});

const adminRefundSchema = Joi.object({
    reservationId: Joi.number().integer().positive().required(),
    action: Joi.string()
        .valid('approve_refund', 'deny_refund', 'custom_refund')
        .required(),
    adjustedRefundAmount: Joi.number()
        .positive()
        .precision(2)
        .when('action', {
            is: 'custom_refund',
            then: Joi.required(),
            otherwise: Joi.optional()
        }),
    notes: Joi.string()
        .max(1000)
        .required()
        .messages({
            'any.required': 'Admin notes are required',
            'string.max': 'Notes cannot exceed 1000 characters'
        })
});

module.exports = {
    createReservationSchema,
    hostActionSchema,
    cancelReservationSchema,
    adminRefundSchema
};