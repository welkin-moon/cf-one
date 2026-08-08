export const APP_CSS_READABILITY = String.raw`
/* Readability and compact-width refinements layered on the Material You shell. */
html{-webkit-text-size-adjust:100%;text-size-adjust:100%}
.compact-brand{overflow:hidden}
.top-actions{flex:0 0 auto}
.brand-copy small{font-size:12px}
.navigation-rail a{font-size:12px}
.bottom-navigation a,.bottom-more{font-size:12px}
.navigation-rail a,.bottom-navigation a,.bottom-more{-webkit-tap-highlight-color:transparent}
.button,.icon-button,.list-item,.feature-card{touch-action:manipulation}

@media(max-width:390px){
  .bottom-navigation a,.bottom-more{font-size:12px}
  .bottom-navigation .nav-icon{width:44px}
  .brand-copy strong{max-width:96px}
}

@media(max-width:350px){
  .top-bar-inner{padding-inline:8px;gap:8px}
  .compact-brand{gap:8px}
  .brand-mark{width:34px;height:34px;flex-basis:34px;border-radius:12px}
  .brand-copy{display:none}
  .top-actions{gap:3px}
  .icon-button{width:40px;height:40px}
  .top-actions .button{min-height:42px;padding-inline:12px}
  .bottom-navigation{padding-inline:4px}
  .bottom-navigation .nav-icon{width:40px}
}

@media(hover:none){
  .feature-card:hover{transform:none}
  .button:hover{box-shadow:none}
}
`;
