export default class ForbiddenError extends Error {
  code: string;

  constructor(message: string) {
    super(message);

    this.name = this.constructor.name;
  }
}
