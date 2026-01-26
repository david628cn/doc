import { createStore, applyMiddleware } from 'redux';
import thunkMiddleware from 'redux-thunk';
import { createLogger } from 'redux-logger';
import globalReducers from '../reducers';
const loggerMiddleware: any = createLogger();
export const store = createStore(
    globalReducers,
    applyMiddleware(
        thunkMiddleware,
        loggerMiddleware
    )
);
