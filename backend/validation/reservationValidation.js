const { Joi } = require('../middleware/validation');

const createReservationSchema = Joi.object({
    listing_id: Joi.number().integer().positive().required(),
    check_in_date: Joi.date().min('now').required(),
    check_out_date: Joi.date().greater(Joi.ref('check_in_date')).required(),
    guest_count: Joi.number().integer().min(1).max(20).required(),
    guest_name: Joi.string().trim().min(2).max(100).required(),
    guest_email: Joi.string().email().required(),
    guest_phone: Joi.string().trim().min(10).max(20).optional(),
    special_requests: Joi.string().max(1000).optional(),
    base_price: Joi.number().positive().required(),
    cleaning_fee: Joi.number().min(0).default(0),
    service_fee: Joi.number().min(0).default(0),
    taxes: Joi.number().min(0).default(0)
});

const updateReservationStatusSchema = Joi.object({
    id: Joi.string().pattern(/^\d+$/).required(),
    status: Joi.string().valid('pending', 'confirmed', 'cancelled', 'completed').required(),
    notes: Joi.string().max(500).optional()
});

const getReservationSchema = Joi.object({
    id: Joi.string().pattern(/^\d+$/).required()
});

module.exports = {
    createReservationSchema,
    updateReservationStatusSchema,
    getReservationSchema
};
