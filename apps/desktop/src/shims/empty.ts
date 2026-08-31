// Nothing, on purpose.
//
// The target of the '@/global.css' redirect in gjsify.config.mjs. That file is the CSS
// entry Uniwind's Metro transform reads, and there is no Metro here: the class
// vocabulary reaches GTK through `configureStyle` instead. See the redirect for the
// full reason.
export const NOTHING = undefined;
