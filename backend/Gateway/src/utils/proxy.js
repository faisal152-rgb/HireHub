const axios = require("axios");

/**
 * Creates an Express request handler that transparently forwards requests to a microservice.
 * - Forwards HTTP method, request body, query parameters, and headers
 * - Forwards responses, including status codes, JSON/text bodies, and Set-Cookie headers
 * - Never crashes the gateway if downstream service responds with 4xx or 5xx
 */
const createServiceProxy = (serviceBaseUrl) => {
  return async (req, res) => {
    try {
      // Strip leading /api from req.originalUrl if present
      const targetPath = req.originalUrl.replace(/^\/api/, "");
      const targetUrl = `${serviceBaseUrl}${targetPath}`;

      const headers = { ...req.headers };
      // Remove host and content-length to avoid conflict with axios
      delete headers.host;
      delete headers["content-length"];
      const isMultipart = headers["content-type"]?.startsWith("multipart/form-data");

      const response = await axios({
        method: req.method,
        url: targetUrl,
        data: isMultipart ? req : req.body,
        headers,
        ...(isMultipart ? { maxBodyLength: Infinity, maxContentLength: Infinity } : {}),
        validateStatus: () => true, // Don't throw for 4xx or 5xx, pass them directly
      });

      // Forward any Set-Cookie headers
      if (response.headers["set-cookie"]) {
        res.setHeader("set-cookie", response.headers["set-cookie"]);
      }

      // Forward Content-Type
      if (response.headers["content-type"]) {
        res.setHeader("content-type", response.headers["content-type"]);
      }

      return res.status(response.status).send(response.data);
    } catch (error) {
      console.error(`Gateway proxy error forwarding to ${serviceBaseUrl}:`, error.message);
      const status = error.response ? error.response.status : 502;
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        error.response?.data ||
        "Service temporarily unavailable. Please try again later.";
      return res.status(status).json({ message, error: message });
    }
  };
};

module.exports = { createServiceProxy };
