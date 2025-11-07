export const asyncHandler = (handler) => {
    return function asyncSafeHandler(req, res, next) {
        Promise.resolve(handler(req, res, next)).catch(next);
    };
};
