//The contract that virtual files need to adhere to when generating static files
export interface StaticPageContract {
  generatePage(context: StaticPageContext): Promise<string>
}

// All apis/data to implementors of StaticPageContract
export interface StaticPageContext {
  getStyleFragment(): Promise<string>
}
