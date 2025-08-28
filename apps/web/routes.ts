/**
 * Public routes are routes that are accessible to all users.
 * they don't require authentication.
 * @type {string[]}
 */
export const publicRoutes =[
    "/",
    "/jobs",
    "/talents",
    "/projects",
    "/services",

]

/**
 * Private routes are routes that are accessible to authenticated users.
 * @type {string[]}
 */
export const privateRoutes = [
    "/agent",
    "/jobs/job-listing/new"
]

/**
 * Auth routes are routes that are accessible to authenticated users.
 * @type {string[]}
 */
export const authRoutes = [
    "/login",
    "/register",
    "/reset",
    "/forgot"
]

/**
 * prefix for API authentication routes.
 * Routes with this prefix used for api authentication purposes.
 * @type {string }
 */
export const apiAuthPrefix = "/api/auth";

/**
 * Default redirect URL after login.
 * @type {string}
 */
export const DEFAULT_LOGIN_REDIRECT = "/";