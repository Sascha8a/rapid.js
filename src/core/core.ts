import defaultsDeep from 'lodash/defaultsDeep';
import kebabCase from 'lodash/kebabCase';
import pluralize from 'pluralize';
import { Config } from '../typings/config.d';
import { CustomRoute } from '../typings/custom-routes.d';
import { RequestData } from '../typings/request.d';
import { Route } from '../typings/routes.d';
import { sanitizeUrl } from '../utils/url';
import Debugger from './../debug/debugger';
import Defaults from './defaults';

class Core {
  protected config: Config;
  protected customRoutes: CustomRoute[];
  protected currentRoute: Route;
  protected http: HttpAdapter;
  protected requestData: RequestData;
  protected routes: Config['routes'];
  protected urlParams: any[];
  protected debugger: Debugger|null;

  constructor(config: Config) {
    this.config = Object.assign({}, defaultsDeep(config, Defaults));
    this.currentRoute = this.config.defaultRoute;
    this.customRoutes = [];
    this.requestData = {
      params: {},
      options: {},
    };
    this.routes = this.config.routes;
    this.urlParams = [];

    this.initialize();
  }

  /**
   * The order of these are important.
   *
   * boot() will allow overriding any config before we set up
   * the http service and routes.
   *
   * sanitizeBaseURL() will sanitize the baseURL prior to setting up
   * the http service and routes.
   *
   * setRoutes() will set up the current routes (model, collection) and their paths
   */
  initialize(): void {
    this.boot();

    this.sanitizeBaseURL();

    this.setRoutes();

    this.defineCustomRoutes();

    this.initializeHttp();

    this.initializeDebugger();
  }

   /**
   * Set any config overrides in this method when extending
   */
  boot(): void {}

  /**
   * Sanitize the baseURL before sending it to the http service
   */
  private sanitizeBaseURL(): void {
    this.config.baseURL = sanitizeUrl(this.config.baseURL, this.config.trailingSlash);
  }

  /**
   * Loop through the routes and set them
   */
  private setRoutes(): void {
    ['model', 'collection'].forEach(route => this.setRoute(route));
    // [Route.MODEL, Route.COLLECTION].forEach(route => this.setRoute(route));
  }

  /**
   * Set the routes for the URL based off model/collection and config
   *
   * @param {Route} route The key of the route to be set
   */
  private setRoute(route: Route): void {
    let newRoute: string = '';
    const formattedRoute: Config['routes'] = {
      model: this.config.modelName,
      collection: pluralize(this.config.modelName),
      any: '',
    };

    if (this.config.routes[route] !== '') {
      newRoute = this.config.routes[route];
    } else {
      newRoute = kebabCase(formattedRoute[route]).replace(/-/g, this.config.routeDelimeter);

      if (this.config.caseSensitive) {
        newRoute = formattedRoute[route];
      }
    }

    this.routes[route] = newRoute;
  }

  /**
   * Set up the custom routes if we have any
   */
  private defineCustomRoutes(): void {
    // if we have custom routes, set up a name:route mapping
    if (this.config.customRoutes.length) {
      this.config.customRoutes.forEach((route: CustomRoute) => {
        this.customRoutes[route.name] = route;
      });
    }
  }

  /**
   * Initialize the API.
   * consider making an adatper interface to talk to http methods
   */
  private initializeHttp(): void {
    const httpConfig = defaultsDeep(
      {
        baseURL: this.config.baseURL.replace(/\/$/, ''),
      },
      this.config.httpConfig,
    );

    const http = this.config.http;

    this.http = new http(httpConfig);
  }

  /**
   * Initialze the debugger if debug is set to true.
   */
  private initializeDebugger(): void {
    this.debugger = this.config.debug ? new Debugger(this) : null;
  }

  /**
   * Resets the request data
   */
  protected resetRequestData(): void {
    this.requestData = {
      params: {},
      options: {},
    };
  }

  /**
   * Reset an URL params set from a relationship
   */
  protected resetURLParams(): void {
    this.urlParams = [];
  }

  /**
   * Getters
   */
  get collection() {
    this.currentRoute = Route.COLLECTION;

    return this;
  }

  get model() {
    this.currentRoute = Route.MODEL;

    return this;
  }

  get any() {
    this.currentRoute = Route.ANY;

    return this;
  }
}

export default Core;