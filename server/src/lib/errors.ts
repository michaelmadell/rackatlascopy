export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function notFound(resource: string): ApiError {
  return new ApiError(404, `${resource} not found`)
}

export function unauthorized(message = 'Unauthorized'): ApiError {
  return new ApiError(401, message)
}
