// backend/utils/responseFormatter.js
exports.success = (res, data, message = 'Success', statusCode = 200) => {
  const response = {
    status: 'success',
    message,
    timestamp: new Date().toISOString()
  };

  if (data) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

exports.error = (res, message, statusCode = 500, details = null) => {
  const response = {
    status: 'error',
    message,
    timestamp: new Date().toISOString()
  };

  if (details && process.env.NODE_ENV === 'development') {
    response.details = details;
  }

  return res.status(statusCode).json(response);
};

exports.paginated = (res, data, pagination, message = 'Success') => {
  return res.status(200).json({
    status: 'success',
    message,
    results: data.length,
    data,
    pagination,
    timestamp: new Date().toISOString()
  });
};

exports.created = (res, data, message = 'Resource created successfully') => {
  return res.status(201).json({
    status: 'success',
    message,
    data,
    timestamp: new Date().toISOString()
  });
};

exports.noContent = (res, message = 'Operation completed successfully') => {
  return res.status(204).json({
    status: 'success',
    message,
    timestamp: new Date().toISOString()
  });
};