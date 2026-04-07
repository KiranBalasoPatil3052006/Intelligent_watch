/**
 * Standardized API response formatter
 */

function success(data, message = null) {
  const response = {
    success: true,
    timestamp: new Date().toISOString()
  };

  if (message) {
    response.message = message;
  }

  if (data !== undefined) {
    response.data = data;
  }

  return response;
}

function error(message, code = null, details = null) {
  const response = {
    success: false,
    error: {
      message: message
    },
    timestamp: new Date().toISOString()
  };

  if (code) {
    response.error.code = code;
  }

  if (details) {
    response.error.details = details;
  }

  return response;
}

function paginated(data, pagination) {
  return {
    success: true,
    data: data,
    pagination: {
      page: pagination.page || 1,
      limit: pagination.limit || 20,
      total: pagination.total || data.length,
      totalPages: pagination.totalPages || Math.ceil(pagination.total / pagination.limit)
    },
    timestamp: new Date().toISOString()
  };
}

module.exports = {
  success,
  error,
  paginated
};
