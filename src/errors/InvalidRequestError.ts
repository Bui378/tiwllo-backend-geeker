export default class InvalidRequestError extends Error {
  code: string;
  param: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}
