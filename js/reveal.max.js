(function (root, factory) {
     if (typeof define === 'function' && define.amd) {
          define(function () {
               root.Reveal = factory();
               return root.Reveal
          })
     } else if (typeof exports === 'object') {
          module.exports = factory()
     } else {
          root.Reveal = factory()
     }
}(this, function () {
     'use strict';
     var Reveal;
     var VERSION = '3.8.0';
     var SLIDES_SELECTOR = '.slides section',
          HORIZONTAL_SLIDES_SELECTOR = '.slides>section',
          VERTICAL_SLIDES_SELECTOR = '.slides>section.present>section',
          HOME_SLIDE_SELECTOR = '.slides>section:first-of-type',
          UA = navigator.userAgent,
          config = {
               width: 960,
               height: 700,
               margin: 0.04,
               minScale: 0.2,
               maxScale: 2.0,
               controls: !0,
               controlsTutorial: !0,
               controlsLayout: 'bottom-right',
               controlsBackArrows: 'faded',
               progress: !0,
               slideNumber: !1,
               showSlideNumber: 'all',
               hashOneBasedIndex: !1,
               hash: !1,
               history: !1,
               keyboard: !0,
               keyboardCondition: null,
               overview: !0,
               disableLayout: !1,
               center: !0,
               touch: !0,
               loop: !1,
               rtl: !1,
               navigationMode: 'default',
               shuffle: !1,
               fragments: !0,
               fragmentInURL: !1,
               embedded: !1,
               help: !0,
               pause: !0,
               showNotes: !1,
               autoPlayMedia: null,
               preloadIframes: null,
               autoSlide: 0,
               autoSlideStoppable: !0,
               autoSlideMethod: null,
               defaultTiming: null,
               mouseWheel: !1,
               rollingLinks: !1,
               hideAddressBar: !0,
               previewLinks: !1,
               postMessage: !0,
               postMessageEvents: !1,
               focusBodyOnPageVisibilityChange: !0,
               transition: 'slide',
               transitionSpeed: 'default',
               backgroundTransition: 'fade',
               parallaxBackgroundImage: '',
               parallaxBackgroundSize: '',
               parallaxBackgroundRepeat: '',
               parallaxBackgroundPosition: '',
               parallaxBackgroundHorizontal: null,
               parallaxBackgroundVertical: null,
               pdfMaxPagesPerSlide: Number.POSITIVE_INFINITY,
               pdfSeparateFragments: !0,
               pdfPageHeightOffset: -1,
               viewDistance: 3,
               display: 'block',
               hideInactiveCursor: !0,
               hideCursorTime: 5000,
               dependencies: []
          },
          initialized = !1,
          loaded = !1,
          overview = !1,
          overviewSlideWidth = null,
          overviewSlideHeight = null,
          indexh, indexv, previousSlide, currentSlide, previousBackground, hasNavigatedRight = !1,
          hasNavigatedDown = !1,
          state = [],
          scale = 1,
          slidesTransform = {
               layout: '',
               overview: ''
          },
          dom = {},
          plugins = {},
          asyncDependencies = [],
          features = {},
          isMobileDevice, isChrome, lastMouseWheelStep = 0,
          writeURLTimeout = 0,
          cursorHidden = !1,
          cursorInactiveTimeout = 0,
          eventsAreBound = !1,
          autoSlide = 0,
          autoSlidePlayer, autoSlideTimeout = 0,
          autoSlideStartTime = -1,
          autoSlidePaused = !1,
          touch = {
               startX: 0,
               startY: 0,
               startCount: 0,
               captured: !1,
               threshold: 40
          },
          keyboardShortcuts = {},
          registeredKeyBindings = {};

     function initialize(options) {
          if (initialized === !0) return;
          initialized = !0;
          checkCapabilities();
          if (!features.transforms2d && !features.transforms3d) {
               document.body.setAttribute('class', 'no-transforms');
               var images = toArray(document.getElementsByTagName('img')),
                    iframes = toArray(document.getElementsByTagName('iframe'));
               var lazyLoadable = images.concat(iframes);
               for (var i = 0, len = lazyLoadable.length; i < len; i++) {
                    var element = lazyLoadable[i];
                    if (element.getAttribute('data-src')) {
                         element.setAttribute('src', element.getAttribute('data-src'));
                         element.removeAttribute('data-src')
                    }
               }
               return
          }
          dom.wrapper = document.querySelector('.reveal');
          dom.slides = document.querySelector('.reveal .slides');
          window.addEventListener('load', layout, !1);
          var query = Reveal.getQueryHash();
          if (typeof query.dependencies !== 'undefined') delete query.dependencies;
          extend(config, options);
          extend(config, query);
          hideAddressBar();
          load()
     }

     function checkCapabilities() {
          isMobileDevice = /(iphone|ipod|ipad|android)/gi.test(UA);
          isChrome = /chrome/i.test(UA) && !/edge/i.test(UA);
          var testElement = document.createElement('div');
          features.transforms3d = 'WebkitPerspective' in testElement.style || 'MozPerspective' in testElement.style || 'msPerspective' in testElement.style || 'OPerspective' in testElement.style || 'perspective' in testElement.style;
          features.transforms2d = 'WebkitTransform' in testElement.style || 'MozTransform' in testElement.style || 'msTransform' in testElement.style || 'OTransform' in testElement.style || 'transform' in testElement.style;
          features.requestAnimationFrameMethod = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame;
          features.requestAnimationFrame = typeof features.requestAnimationFrameMethod === 'function';
          features.canvas = !!document.createElement('canvas').getContext;
          features.overviewTransitions = !/Version\/[\d\.]+.*Safari/.test(UA);
          features.zoom = 'zoom' in testElement.style && !isMobileDevice && (isChrome || /Version\/[\d\.]+.*Safari/.test(UA))
     }

     function load() {
          var scripts = [],
               scriptsToLoad = 0;
          config.dependencies.forEach(function (s) {
               if (!s.condition || s.condition()) {
                    if (s.async) {
                         asyncDependencies.push(s)
                    } else {
                         scripts.push(s)
                    }
               }
          });
          if (scripts.length) {
               scriptsToLoad = scripts.length;
               scripts.forEach(function (s) {
                    loadScript(s.src, function () {
                         if (typeof s.callback === 'function') s.callback();
                         if (--scriptsToLoad === 0) {
                              initPlugins()
                         }
                    })
               })
          } else {
               initPlugins()
          }
     }

     function initPlugins() {
          var pluginsToInitialize = Object.keys(plugins).length;
          if (pluginsToInitialize === 0) {
               loadAsyncDependencies()
          } else {
               var afterPlugInitialized = function () {
                    if (--pluginsToInitialize === 0) {
                         loadAsyncDependencies()
                    }
               };
               for (var i in plugins) {
                    var plugin = plugins[i];
                    if (typeof plugin.init === 'function') {
                         var callback = plugin.init();
                         if (callback && typeof callback.then === 'function') {
                              callback.then(afterPlugInitialized)
                         } else {
                              afterPlugInitialized()
                         }
                    } else {
                         afterPlugInitialized()
                    }
               }
          }
     }

     function loadAsyncDependencies() {
          if (asyncDependencies.length) {
               asyncDependencies.forEach(function (s) {
                    loadScript(s.src, s.callback)
               })
          }
          start()
     }

     function loadScript(url, callback) {
          var script = document.createElement('script');
          script.type = 'text/javascript';
          script.async = !1;
          script.defer = !1;
          script.src = url;
          if (callback) {
               script.onload = script.onreadystatechange = function (event) {
                    if (event.type === "load" || (/loaded|complete/.test(script.readyState))) {
                         script.onload = script.onreadystatechange = script.onerror = null;
                         callback()
                    }
               };
               script.onerror = function (err) {
                    script.onload = script.onreadystatechange = script.onerror = null;
                    callback(new Error('Failed loading script: ' + script.src + '\n' + err))
               }
          }
          var head = document.querySelector('head');
          head.insertBefore(script, head.lastChild)
     }

     function start() {
          loaded = !0;
          setupDOM();
          setupPostMessage();
          setupScrollPrevention();
          resetVerticalSlides();
          configure();
          readURL();
          updateBackground(!0);
          setTimeout(function () {
               dom.slides.classList.remove('no-transition');
               dom.wrapper.classList.add('ready');
               dispatchEvent('ready', {
                    'indexh': indexh,
                    'indexv': indexv,
                    'currentSlide': currentSlide
               })
          }, 1);
          if (isPrintingPDF()) {
               removeEventListeners();
               if (document.readyState === 'complete') {
                    setupPDF()
               } else {
                    window.addEventListener('load', setupPDF)
               }
          }
     }

     function setupDOM() {
          dom.slides.classList.add('no-transition');
          if (isMobileDevice) {
               dom.wrapper.classList.add('no-hover')
          } else {
               dom.wrapper.classList.remove('no-hover')
          }
          if (/iphone/gi.test(UA)) {
               dom.wrapper.classList.add('ua-iphone')
          } else {
               dom.wrapper.classList.remove('ua-iphone')
          }
          dom.background = createSingletonNode(dom.wrapper, 'div', 'backgrounds', null);
          dom.progress = createSingletonNode(dom.wrapper, 'div', 'progress', '<span></span>');
          dom.progressbar = dom.progress.querySelector('span');
          dom.controls = createSingletonNode(dom.wrapper, 'aside', 'controls', '<button class="navigate-left" aria-label="previous slide"><div class="controls-arrow"></div></button>' + '<button class="navigate-right" aria-label="next slide"><div class="controls-arrow"></div></button>' + '<button class="navigate-up" aria-label="above slide"><div class="controls-arrow"></div></button>' + '<button class="navigate-down" aria-label="below slide"><div class="controls-arrow"></div></button>');
          dom.slideNumber = createSingletonNode(dom.wrapper, 'div', 'slide-number', '');
          dom.speakerNotes = createSingletonNode(dom.wrapper, 'div', 'speaker-notes', null);
          dom.speakerNotes.setAttribute('data-prevent-swipe', '');
          dom.speakerNotes.setAttribute('tabindex', '0');
          dom.pauseOverlay = createSingletonNode(dom.wrapper, 'div', 'pause-overlay', config.controls ? '<button class="resume-button">Resume presentation</button>' : null);
          dom.wrapper.setAttribute('role', 'application');
          dom.controlsLeft = toArray(document.querySelectorAll('.navigate-left'));
          dom.controlsRight = toArray(document.querySelectorAll('.navigate-right'));
          dom.controlsUp = toArray(document.querySelectorAll('.navigate-up'));
          dom.controlsDown = toArray(document.querySelectorAll('.navigate-down'));
          dom.controlsPrev = toArray(document.querySelectorAll('.navigate-prev'));
          dom.controlsNext = toArray(document.querySelectorAll('.navigate-next'));
          dom.controlsRightArrow = dom.controls.querySelector('.navigate-right');
          dom.controlsDownArrow = dom.controls.querySelector('.navigate-down');
          dom.statusDiv = createStatusDiv()
     }

     function createStatusDiv() {
          var statusDiv = document.getElementById('aria-status-div');
          if (!statusDiv) {
               statusDiv = document.createElement('div');
               statusDiv.style.position = 'absolute';
               statusDiv.style.height = '1px';
               statusDiv.style.width = '1px';
               statusDiv.style.overflow = 'hidden';
               statusDiv.style.clip = 'rect( 1px, 1px, 1px, 1px )';
               statusDiv.setAttribute('id', 'aria-status-div');
               statusDiv.setAttribute('aria-live', 'polite');
               statusDiv.setAttribute('aria-atomic', 'true');
               dom.wrapper.appendChild(statusDiv)
          }
          return statusDiv
     }

     function getStatusText(node) {
          var text = '';
          if (node.nodeType === 3) {
               text += node.textContent
          } else if (node.nodeType === 1) {
               var isAriaHidden = node.getAttribute('aria-hidden');
               var isDisplayHidden = window.getComputedStyle(node)['display'] === 'none';
               if (isAriaHidden !== 'true' && !isDisplayHidden) {
                    toArray(node.childNodes).forEach(function (child) {
                         text += getStatusText(child)
                    })
               }
          }
          return text
     }

     function setupPDF() {
          var slideSize = getComputedSlideSize(window.innerWidth, window.innerHeight);
          var pageWidth = Math.floor(slideSize.width * (1 + config.margin)),
               pageHeight = Math.floor(slideSize.height * (1 + config.margin));
          var slideWidth = slideSize.width,
               slideHeight = slideSize.height;
          injectStyleSheet('@page{size:' + pageWidth + 'px ' + pageHeight + 'px; margin: 0px;}');
          injectStyleSheet('.reveal section>img, .reveal section>video, .reveal section>iframe{max-width: ' + slideWidth + 'px; max-height:' + slideHeight + 'px}');
          document.body.classList.add('print-pdf');
          document.body.style.width = pageWidth + 'px';
          document.body.style.height = pageHeight + 'px';
          layoutSlideContents(slideWidth, slideHeight);
          toArray(dom.wrapper.querySelectorAll(HORIZONTAL_SLIDES_SELECTOR)).forEach(function (hslide, h) {
               hslide.setAttribute('data-index-h', h);
               if (hslide.classList.contains('stack')) {
                    toArray(hslide.querySelectorAll('section')).forEach(function (vslide, v) {
                         vslide.setAttribute('data-index-h', h);
                         vslide.setAttribute('data-index-v', v)
                    })
               }
          });
          toArray(dom.wrapper.querySelectorAll(SLIDES_SELECTOR)).forEach(function (slide) {
               if (slide.classList.contains('stack') === !1) {
                    var left = (pageWidth - slideWidth) / 2,
                         top = (pageHeight - slideHeight) / 2;
                    var contentHeight = slide.scrollHeight;
                    var numberOfPages = Math.max(Math.ceil(contentHeight / pageHeight), 1);
                    numberOfPages = Math.min(numberOfPages, config.pdfMaxPagesPerSlide);
                    if (numberOfPages === 1 && config.center || slide.classList.contains('center')) {
                         top = Math.max((pageHeight - contentHeight) / 2, 0)
                    }
                    var page = document.createElement('div');
                    page.className = 'pdf-page';
                    page.style.height = ((pageHeight + config.pdfPageHeightOffset) * numberOfPages) + 'px';
                    slide.parentNode.insertBefore(page, slide);
                    page.appendChild(slide);
                    slide.style.left = left + 'px';
                    slide.style.top = top + 'px';
                    slide.style.width = slideWidth + 'px';
                    if (slide.slideBackgroundElement) {
                         page.insertBefore(slide.slideBackgroundElement, slide)
                    }
                    if (config.showNotes) {
                         var notes = getSlideNotes(slide);
                         if (notes) {
                              var notesSpacing = 8;
                              var notesLayout = typeof config.showNotes === 'string' ? config.showNotes : 'inline';
                              var notesElement = document.createElement('div');
                              notesElement.classList.add('speaker-notes');
                              notesElement.classList.add('speaker-notes-pdf');
                              notesElement.setAttribute('data-layout', notesLayout);
                              notesElement.innerHTML = notes;
                              if (notesLayout === 'separate-page') {
                                   page.parentNode.insertBefore(notesElement, page.nextSibling)
                              } else {
                                   notesElement.style.left = notesSpacing + 'px';
                                   notesElement.style.bottom = notesSpacing + 'px';
                                   notesElement.style.width = (pageWidth - notesSpacing * 2) + 'px';
                                   page.appendChild(notesElement)
                              }
                         }
                    }
                    if (config.slideNumber && /all|print/i.test(config.showSlideNumber)) {
                         var slideNumberH = parseInt(slide.getAttribute('data-index-h'), 10) + 1,
                              slideNumberV = parseInt(slide.getAttribute('data-index-v'), 10) + 1;
                         var numberElement = document.createElement('div');
                         numberElement.classList.add('slide-number');
                         numberElement.classList.add('slide-number-pdf');
                         numberElement.innerHTML = formatSlideNumber(slideNumberH, '.', slideNumberV);
                         page.appendChild(numberElement)
                    }
                    if (config.pdfSeparateFragments) {
                         var fragmentGroups = sortFragments(page.querySelectorAll('.fragment'), !0);
                         var previousFragmentStep;
                         var previousPage;
                         fragmentGroups.forEach(function (fragments) {
                              if (previousFragmentStep) {
                                   previousFragmentStep.forEach(function (fragment) {
                                        fragment.classList.remove('current-fragment')
                                   })
                              }
                              fragments.forEach(function (fragment) {
                                   fragment.classList.add('visible', 'current-fragment')
                              });
                              var clonedPage = page.cloneNode(!0);
                              page.parentNode.insertBefore(clonedPage, (previousPage || page).nextSibling);
                              previousFragmentStep = fragments;
                              previousPage = clonedPage
                         });
                         fragmentGroups.forEach(function (fragments) {
                              fragments.forEach(function (fragment) {
                                   fragment.classList.remove('visible', 'current-fragment')
                              })
                         })
                    } else {
                         toArray(page.querySelectorAll('.fragment:not(.fade-out)')).forEach(function (fragment) {
                              fragment.classList.add('visible')
                         })
                    }
               }
          });
          dispatchEvent('pdf-ready')
     }

     function setupScrollPrevention() {
          setInterval(function () {
               if (dom.wrapper.scrollTop !== 0 || dom.wrapper.scrollLeft !== 0) {
                    dom.wrapper.scrollTop = 0;
                    dom.wrapper.scrollLeft = 0
               }
          }, 1000)
     }

     function createSingletonNode(container, tagname, classname, innerHTML) {
          var nodes = container.querySelectorAll('.' + classname);
          for (var i = 0; i < nodes.length; i++) {
               var testNode = nodes[i];
               if (testNode.parentNode === container) {
                    return testNode
               }
          }
          var node = document.createElement(tagname);
          node.className = classname;
          if (typeof innerHTML === 'string') {
               node.innerHTML = innerHTML
          }
          container.appendChild(node);
          return node
     }

     function createBackgrounds() {
          var printMode = isPrintingPDF();
          dom.background.innerHTML = '';
          dom.background.classList.add('no-transition');
          toArray(dom.wrapper.querySelectorAll(HORIZONTAL_SLIDES_SELECTOR)).forEach(function (slideh) {
               var backgroundStack = createBackground(slideh, dom.background);
               toArray(slideh.querySelectorAll('section')).forEach(function (slidev) {
                    createBackground(slidev, backgroundStack);
                    backgroundStack.classList.add('stack')
               })
          });
          if (config.parallaxBackgroundImage) {
               dom.background.style.backgroundImage = 'url("' + config.parallaxBackgroundImage + '")';
               dom.background.style.backgroundSize = config.parallaxBackgroundSize;
               dom.background.style.backgroundRepeat = config.parallaxBackgroundRepeat;
               dom.background.style.backgroundPosition = config.parallaxBackgroundPosition;
               setTimeout(function () {
                    dom.wrapper.classList.add('has-parallax-background')
               }, 1)
          } else {
               dom.background.style.backgroundImage = '';
               dom.wrapper.classList.remove('has-parallax-background')
          }
     }

     function createBackground(slide, container) {
          var element = document.createElement('div');
          element.className = 'slide-background ' + slide.className.replace(/present|past|future/, '');
          var contentElement = document.createElement('div');
          contentElement.className = 'slide-background-content';
          element.appendChild(contentElement);
          container.appendChild(element);
          slide.slideBackgroundElement = element;
          slide.slideBackgroundContentElement = contentElement;
          syncBackground(slide);
          return element
     }

     function syncBackground(slide) {
          var element = slide.slideBackgroundElement,
               contentElement = slide.slideBackgroundContentElement;
          slide.classList.remove('has-dark-background');
          slide.classList.remove('has-light-background');
          element.removeAttribute('data-loaded');
          element.removeAttribute('data-background-hash');
          element.removeAttribute('data-background-size');
          element.removeAttribute('data-background-transition');
          element.style.backgroundColor = '';
          contentElement.style.backgroundSize = '';
          contentElement.style.backgroundRepeat = '';
          contentElement.style.backgroundPosition = '';
          contentElement.style.backgroundImage = '';
          contentElement.style.opacity = '';
          contentElement.innerHTML = '';
          var data = {
               background: slide.getAttribute('data-background'),
               backgroundSize: slide.getAttribute('data-background-size'),
               backgroundImage: slide.getAttribute('data-background-image'),
               backgroundVideo: slide.getAttribute('data-background-video'),
               backgroundIframe: slide.getAttribute('data-background-iframe'),
               backgroundColor: slide.getAttribute('data-background-color'),
               backgroundRepeat: slide.getAttribute('data-background-repeat'),
               backgroundPosition: slide.getAttribute('data-background-position'),
               backgroundTransition: slide.getAttribute('data-background-transition'),
               backgroundOpacity: slide.getAttribute('data-background-opacity')
          };
          if (data.background) {
               if (/^(http|file|\/\/)/gi.test(data.background) || /\.(svg|png|jpg|jpeg|gif|bmp)([?#\s]|$)/gi.test(data.background)) {
                    slide.setAttribute('data-background-image', data.background)
               } else {
                    element.style.background = data.background
               }
          }
          if (data.background || data.backgroundColor || data.backgroundImage || data.backgroundVideo || data.backgroundIframe) {
               element.setAttribute('data-background-hash', data.background + data.backgroundSize + data.backgroundImage + data.backgroundVideo + data.backgroundIframe + data.backgroundColor + data.backgroundRepeat + data.backgroundPosition + data.backgroundTransition + data.backgroundOpacity)
          }
          if (data.backgroundSize) element.setAttribute('data-background-size', data.backgroundSize);
          if (data.backgroundColor) element.style.backgroundColor = data.backgroundColor;
          if (data.backgroundTransition) element.setAttribute('data-background-transition', data.backgroundTransition);
          if (data.backgroundSize) contentElement.style.backgroundSize = data.backgroundSize;
          if (data.backgroundRepeat) contentElement.style.backgroundRepeat = data.backgroundRepeat;
          if (data.backgroundPosition) contentElement.style.backgroundPosition = data.backgroundPosition;
          if (data.backgroundOpacity) contentElement.style.opacity = data.backgroundOpacity;
          var contrastColor = data.backgroundColor;
          if (!contrastColor) {
               var computedBackgroundStyle = window.getComputedStyle(element);
               if (computedBackgroundStyle && computedBackgroundStyle.backgroundColor) {
                    contrastColor = computedBackgroundStyle.backgroundColor
               }
          }
          if (contrastColor) {
               var rgb = colorToRgb(contrastColor);
               if (rgb && rgb.a !== 0) {
                    if (colorBrightness(contrastColor) < 128) {
                         slide.classList.add('has-dark-background')
                    } else {
                         slide.classList.add('has-light-background')
                    }
               }
          }
     }

     function setupPostMessage() {
          if (config.postMessage) {
               window.addEventListener('message', function (event) {
                    var data = event.data;
                    if (typeof data === 'string' && data.charAt(0) === '{' && data.charAt(data.length - 1) === '}') {
                         data = JSON.parse(data);
                         if (data.method && typeof Reveal[data.method] === 'function') {
                              Reveal[data.method].apply(Reveal, data.args)
                         }
                    }
               }, !1)
          }
     }

     function configure(options) {
          var oldTransition = config.transition;
          if (typeof options === 'object') extend(config, options);
          if (loaded === !1) return;
          var numberOfSlides = dom.wrapper.querySelectorAll(SLIDES_SELECTOR).length;
          dom.wrapper.classList.remove(oldTransition);
          if (features.transforms3d === !1) config.transition = 'linear';
          dom.wrapper.classList.add(config.transition);
          dom.wrapper.setAttribute('data-transition-speed', config.transitionSpeed);
          dom.wrapper.setAttribute('data-background-transition', config.backgroundTransition);
          dom.controls.style.display = config.controls ? 'block' : 'none';
          dom.progress.style.display = config.progress ? 'block' : 'none';
          dom.controls.setAttribute('data-controls-layout', config.controlsLayout);
          dom.controls.setAttribute('data-controls-back-arrows', config.controlsBackArrows);
          if (config.shuffle) {
               shuffle()
          }
          if (config.rtl) {
               dom.wrapper.classList.add('rtl')
          } else {
               dom.wrapper.classList.remove('rtl')
          }
          if (config.center) {
               dom.wrapper.classList.add('center')
          } else {
               dom.wrapper.classList.remove('center')
          }
          if (config.pause === !1) {
               resume()
          }
          if (config.showNotes) {
               dom.speakerNotes.setAttribute('data-layout', typeof config.showNotes === 'string' ? config.showNotes : 'inline')
          }
          if (config.mouseWheel) {
               document.addEventListener('DOMMouseScroll', onDocumentMouseScroll, !1);
               document.addEventListener('mousewheel', onDocumentMouseScroll, !1)
          } else {
               document.removeEventListener('DOMMouseScroll', onDocumentMouseScroll, !1);
               document.removeEventListener('mousewheel', onDocumentMouseScroll, !1)
          }
          if (config.rollingLinks) {
               enableRollingLinks()
          } else {
               disableRollingLinks()
          }
          if (config.hideInactiveCursor) {
               document.addEventListener('mousemove', onDocumentCursorActive, !1);
               document.addEventListener('mousedown', onDocumentCursorActive, !1)
          } else {
               showCursor();
               document.removeEventListener('mousemove', onDocumentCursorActive, !1);
               document.removeEventListener('mousedown', onDocumentCursorActive, !1)
          }
          if (config.previewLinks) {
               enablePreviewLinks();
               disablePreviewLinks('[data-preview-link=false]')
          } else {
               disablePreviewLinks();
               enablePreviewLinks('[data-preview-link]:not([data-preview-link=false])')
          }
          if (autoSlidePlayer) {
               autoSlidePlayer.destroy();
               autoSlidePlayer = null
          }
          if (numberOfSlides > 1 && config.autoSlide && config.autoSlideStoppable && features.canvas && features.requestAnimationFrame) {
               autoSlidePlayer = new Playback(dom.wrapper, function () {
                    return Math.min(Math.max((Date.now() - autoSlideStartTime) / autoSlide, 0), 1)
               });
               autoSlidePlayer.on('click', onAutoSlidePlayerClick);
               autoSlidePaused = !1
          }
          if (config.fragments === !1) {
               toArray(dom.slides.querySelectorAll('.fragment')).forEach(function (element) {
                    element.classList.add('visible');
                    element.classList.remove('current-fragment')
               })
          }
          var slideNumberDisplay = 'none';
          if (config.slideNumber && !isPrintingPDF()) {
               if (config.showSlideNumber === 'all') {
                    slideNumberDisplay = 'block'
               } else if (config.showSlideNumber === 'speaker' && isSpeakerNotes()) {
                    slideNumberDisplay = 'block'
               }
          }
          dom.slideNumber.style.display = slideNumberDisplay;
          if (config.navigationMode !== 'default') {
               dom.wrapper.setAttribute('data-navigation-mode', config.navigationMode)
          } else {
               dom.wrapper.removeAttribute('data-navigation-mode')
          }
          if (config.navigationMode === 'linear') {
               keyboardShortcuts['&#8594;  ,  &#8595;  ,  SPACE  ,  N  ,  L  ,  J'] = 'Next slide';
               keyboardShortcuts['&#8592;  ,  &#8593;  ,  P  ,  H  ,  K'] = 'Previous slide'
          } else {
               keyboardShortcuts['N  ,  SPACE'] = 'Next slide';
               keyboardShortcuts.P = 'Previous slide';
               keyboardShortcuts['&#8592;  ,  H'] = 'Navigate left';
               keyboardShortcuts['&#8594;  ,  L'] = 'Navigate right';
               keyboardShortcuts['&#8593;  ,  K'] = 'Navigate up';
               keyboardShortcuts['&#8595;  ,  J'] = 'Navigate down'
          }
          keyboardShortcuts['Home  ,  &#8984;/CTRL &#8592;'] = 'First slide';
          keyboardShortcuts['End  ,  &#8984;/CTRL &#8594;'] = 'Last slide';
          keyboardShortcuts['B  ,  .'] = 'Pause';
          keyboardShortcuts.F = 'Fullscreen';
          keyboardShortcuts['ESC, O'] = 'Slide overview';
          sync()
     }

     function addEventListeners() {
          eventsAreBound = !0;
          window.addEventListener('hashchange', onWindowHashChange, !1);
          window.addEventListener('resize', onWindowResize, !1);
          if (config.touch) {
               if ('onpointerdown' in window) {
                    dom.wrapper.addEventListener('pointerdown', onPointerDown, !1);
                    dom.wrapper.addEventListener('pointermove', onPointerMove, !1);
                    dom.wrapper.addEventListener('pointerup', onPointerUp, !1)
               } else if (window.navigator.msPointerEnabled) {
                    dom.wrapper.addEventListener('MSPointerDown', onPointerDown, !1);
                    dom.wrapper.addEventListener('MSPointerMove', onPointerMove, !1);
                    dom.wrapper.addEventListener('MSPointerUp', onPointerUp, !1)
               } else {
                    dom.wrapper.addEventListener('touchstart', onTouchStart, !1);
                    dom.wrapper.addEventListener('touchmove', onTouchMove, !1);
                    dom.wrapper.addEventListener('touchend', onTouchEnd, !1)
               }
          }
          if (config.keyboard) {
               document.addEventListener('keydown', onDocumentKeyDown, !1);
               document.addEventListener('keypress', onDocumentKeyPress, !1)
          }
          if (config.progress && dom.progress) {
               dom.progress.addEventListener('click', onProgressClicked, !1)
          }
          dom.pauseOverlay.addEventListener('click', resume, !1);
          if (config.focusBodyOnPageVisibilityChange) {
               var visibilityChange;
               if ('hidden' in document) {
                    visibilityChange = 'visibilitychange'
               } else if ('msHidden' in document) {
                    visibilityChange = 'msvisibilitychange'
               } else if ('webkitHidden' in document) {
                    visibilityChange = 'webkitvisibilitychange'
               }
               if (visibilityChange) {
                    document.addEventListener(visibilityChange, onPageVisibilityChange, !1)
               }
          }
          var pointerEvents = ['touchstart', 'click'];
          if (UA.match(/android/gi)) {
               pointerEvents = ['touchstart']
          }
          pointerEvents.forEach(function (eventName) {
               dom.controlsLeft.forEach(function (el) {
                    el.addEventListener(eventName, onNavigateLeftClicked, !1)
               });
               dom.controlsRight.forEach(function (el) {
                    el.addEventListener(eventName, onNavigateRightClicked, !1)
               });
               dom.controlsUp.forEach(function (el) {
                    el.addEventListener(eventName, onNavigateUpClicked, !1)
               });
               dom.controlsDown.forEach(function (el) {
                    el.addEventListener(eventName, onNavigateDownClicked, !1)
               });
               dom.controlsPrev.forEach(function (el) {
                    el.addEventListener(eventName, onNavigatePrevClicked, !1)
               });
               dom.controlsNext.forEach(function (el) {
                    el.addEventListener(eventName, onNavigateNextClicked, !1)
               })
          })
     }

     function removeEventListeners() {
          eventsAreBound = !1;
          document.removeEventListener('keydown', onDocumentKeyDown, !1);
          document.removeEventListener('keypress', onDocumentKeyPress, !1);
          window.removeEventListener('hashchange', onWindowHashChange, !1);
          window.removeEventListener('resize', onWindowResize, !1);
          dom.wrapper.removeEventListener('pointerdown', onPointerDown, !1);
          dom.wrapper.removeEventListener('pointermove', onPointerMove, !1);
          dom.wrapper.removeEventListener('pointerup', onPointerUp, !1);
          dom.wrapper.removeEventListener('MSPointerDown', onPointerDown, !1);
          dom.wrapper.removeEventListener('MSPointerMove', onPointerMove, !1);
          dom.wrapper.removeEventListener('MSPointerUp', onPointerUp, !1);
          dom.wrapper.removeEventListener('touchstart', onTouchStart, !1);
          dom.wrapper.removeEventListener('touchmove', onTouchMove, !1);
          dom.wrapper.removeEventListener('touchend', onTouchEnd, !1);
          dom.pauseOverlay.removeEventListener('click', resume, !1);
          if (config.progress && dom.progress) {
               dom.progress.removeEventListener('click', onProgressClicked, !1)
          } ['touchstart', 'click'].forEach(function (eventName) {
               dom.controlsLeft.forEach(function (el) {
                    el.removeEventListener(eventName, onNavigateLeftClicked, !1)
               });
               dom.controlsRight.forEach(function (el) {
                    el.removeEventListener(eventName, onNavigateRightClicked, !1)
               });
               dom.controlsUp.forEach(function (el) {
                    el.removeEventListener(eventName, onNavigateUpClicked, !1)
               });
               dom.controlsDown.forEach(function (el) {
                    el.removeEventListener(eventName, onNavigateDownClicked, !1)
               });
               dom.controlsPrev.forEach(function (el) {
                    el.removeEventListener(eventName, onNavigatePrevClicked, !1)
               });
               dom.controlsNext.forEach(function (el) {
                    el.removeEventListener(eventName, onNavigateNextClicked, !1)
               })
          })
     }

     function registerPlugin(id, plugin) {
          if (plugins[id] === undefined) {
               plugins[id] = plugin;
               if (loaded && typeof plugin.init === 'function') {
                    plugin.init()
               }
          } else {
               console.warn('reveal.js: "' + id + '" plugin has already been registered')
          }
     }

     function hasPlugin(id) {
          return !!plugins[id]
     }

     function getPlugin(id) {
          return plugins[id]
     }

     function addKeyBinding(binding, callback) {
          if (typeof binding === 'object' && binding.keyCode) {
               registeredKeyBindings[binding.keyCode] = {
                    callback: callback,
                    key: binding.key,
                    description: binding.description
               }
          } else {
               registeredKeyBindings[binding] = {
                    callback: callback,
                    key: null,
                    description: null
               }
          }
     }

     function removeKeyBinding(keyCode) {
          delete registeredKeyBindings[keyCode]
     }

     function extend(a, b) {
          for (var i in b) {
               a[i] = b[i]
          }
          return a
     }

     function toArray(o) {
          return Array.prototype.slice.call(o)
     }

     function deserialize(value) {
          if (typeof value === 'string') {
               if (value === 'null') return null;
               else if (value === 'true') return !0;
               else if (value === 'false') return !1;
               else if (value.match(/^-?[\d\.]+$/)) return parseFloat(value)
          }
          return value
     }

     function distanceBetween(a, b) {
          var dx = a.x - b.x,
               dy = a.y - b.y;
          return Math.sqrt(dx * dx + dy * dy)
     }

     function transformElement(element, transform) {
          element.style.WebkitTransform = transform;
          element.style.MozTransform = transform;
          element.style.msTransform = transform;
          element.style.transform = transform
     }

     function transformSlides(transforms) {
          if (typeof transforms.layout === 'string') slidesTransform.layout = transforms.layout;
          if (typeof transforms.overview === 'string') slidesTransform.overview = transforms.overview;
          if (slidesTransform.layout) {
               transformElement(dom.slides, slidesTransform.layout + ' ' + slidesTransform.overview)
          } else {
               transformElement(dom.slides, slidesTransform.overview)
          }
     }

     function injectStyleSheet(value) {
          var tag = document.createElement('style');
          tag.type = 'text/css';
          if (tag.styleSheet) {
               tag.styleSheet.cssText = value
          } else {
               tag.appendChild(document.createTextNode(value))
          }
          document.getElementsByTagName('head')[0].appendChild(tag)
     }

     function closestParent(target, selector) {
          var parent = target.parentNode;
          while (parent) {
               var matchesMethod = parent.matches || parent.matchesSelector || parent.msMatchesSelector;
               if (matchesMethod && matchesMethod.call(parent, selector)) {
                    return parent
               }
               parent = parent.parentNode
          }
          return null
     }

     function colorToRgb(color) {
          var hex3 = color.match(/^#([0-9a-f]{3})$/i);
          if (hex3 && hex3[1]) {
               hex3 = hex3[1];
               return {
                    r: parseInt(hex3.charAt(0), 16) * 0x11,
                    g: parseInt(hex3.charAt(1), 16) * 0x11,
                    b: parseInt(hex3.charAt(2), 16) * 0x11
               }
          }
          var hex6 = color.match(/^#([0-9a-f]{6})$/i);
          if (hex6 && hex6[1]) {
               hex6 = hex6[1];
               return {
                    r: parseInt(hex6.substr(0, 2), 16),
                    g: parseInt(hex6.substr(2, 2), 16),
                    b: parseInt(hex6.substr(4, 2), 16)
               }
          }
          var rgb = color.match(/^rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
          if (rgb) {
               return {
                    r: parseInt(rgb[1], 10),
                    g: parseInt(rgb[2], 10),
                    b: parseInt(rgb[3], 10)
               }
          }
          var rgba = color.match(/^rgba\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\,\s*([\d]+|[\d]*.[\d]+)\s*\)$/i);
          if (rgba) {
               return {
                    r: parseInt(rgba[1], 10),
                    g: parseInt(rgba[2], 10),
                    b: parseInt(rgba[3], 10),
                    a: parseFloat(rgba[4])
               }
          }
          return null
     }

     function colorBrightness(color) {
          if (typeof color === 'string') color = colorToRgb(color);
          if (color) {
               return (color.r * 299 + color.g * 587 + color.b * 114) / 1000
          }
          return null
     }

     function getRemainingHeight(element, height) {
          height = height || 0;
          if (element) {
               var newHeight, oldHeight = element.style.height;
               element.style.height = '0px';
               element.parentNode.style.height = 'auto';
               newHeight = height - element.parentNode.offsetHeight;
               element.style.height = oldHeight + 'px';
               element.parentNode.style.removeProperty('height');
               return newHeight
          }
          return height
     }

     function isPrintingPDF() {
          return (/print-pdf/gi).test(window.location.search)
     }

     function hideAddressBar() {
          if (config.hideAddressBar && isMobileDevice) {
               window.addEventListener('load', removeAddressBar, !1);
               window.addEventListener('orientationchange', removeAddressBar, !1)
          }
     }

     function removeAddressBar() {
          setTimeout(function () {
               window.scrollTo(0, 1)
          }, 10)
     }

     function dispatchEvent(type, args) {
          var event = document.createEvent('HTMLEvents', 1, 2);
          event.initEvent(type, !0, !0);
          extend(event, args);
          dom.wrapper.dispatchEvent(event);
          if (config.postMessageEvents && window.parent !== window.self) {
               window.parent.postMessage(JSON.stringify({
                    namespace: 'reveal',
                    eventName: type,
                    state: getState()
               }), '*')
          }
     }

     function enableRollingLinks() {
          if (features.transforms3d && !('msPerspective' in document.body.style)) {
               var anchors = dom.wrapper.querySelectorAll(SLIDES_SELECTOR + ' a');
               for (var i = 0, len = anchors.length; i < len; i++) {
                    var anchor = anchors[i];
                    if (anchor.textContent && !anchor.querySelector('*') && (!anchor.className || !anchor.classList.contains(anchor, 'roll'))) {
                         var span = document.createElement('span');
                         span.setAttribute('data-title', anchor.text);
                         span.innerHTML = anchor.innerHTML;
                         anchor.classList.add('roll');
                         anchor.innerHTML = '';
                         anchor.appendChild(span)
                    }
               }
          }
     }

     function disableRollingLinks() {
          var anchors = dom.wrapper.querySelectorAll(SLIDES_SELECTOR + ' a.roll');
          for (var i = 0, len = anchors.length; i < len; i++) {
               var anchor = anchors[i];
               var span = anchor.querySelector('span');
               if (span) {
                    anchor.classList.remove('roll');
                    anchor.innerHTML = span.innerHTML
               }
          }
     }

     function enablePreviewLinks(selector) {
          var anchors = toArray(document.querySelectorAll(selector ? selector : 'a'));
          anchors.forEach(function (element) {
               if (/^(http|www)/gi.test(element.getAttribute('href'))) {
                    element.addEventListener('click', onPreviewLinkClicked, !1)
               }
          })
     }

     function disablePreviewLinks(selector) {
          var anchors = toArray(document.querySelectorAll(selector ? selector : 'a'));
          anchors.forEach(function (element) {
               if (/^(http|www)/gi.test(element.getAttribute('href'))) {
                    element.removeEventListener('click', onPreviewLinkClicked, !1)
               }
          })
     }

     function showPreview(url) {
          closeOverlay();
          dom.overlay = document.createElement('div');
          dom.overlay.classList.add('overlay');
          dom.overlay.classList.add('overlay-preview');
          dom.wrapper.appendChild(dom.overlay);
          dom.overlay.innerHTML = ['<header>', '<a class="close" href="#"><span class="icon"></span></a>', '<a class="external" href="' + url + '" target="_blank"><span class="icon"></span></a>', '</header>', '<div class="spinner"></div>', '<div class="viewport">', '<iframe src="' + url + '"></iframe>', '<small class="viewport-inner">', '<span class="x-frame-error">Unable to load iframe. This is likely due to the site\'s policy (x-frame-options).</span>', '</small>', '</div>'].join('');
          dom.overlay.querySelector('iframe').addEventListener('load', function (event) {
               dom.overlay.classList.add('loaded')
          }, !1);
          dom.overlay.querySelector('.close').addEventListener('click', function (event) {
               closeOverlay();
               event.preventDefault()
          }, !1);
          dom.overlay.querySelector('.external').addEventListener('click', function (event) {
               closeOverlay()
          }, !1);
          setTimeout(function () {
               dom.overlay.classList.add('visible')
          }, 1)
     }

     function toggleHelp(override) {
          if (typeof override === 'boolean') {
               override ? showHelp() : closeOverlay()
          } else {
               if (dom.overlay) {
                    closeOverlay()
               } else {
                    showHelp()
               }
          }
     }

     function showHelp() {
          if (config.help) {
               closeOverlay();
               dom.overlay = document.createElement('div');
               dom.overlay.classList.add('overlay');
               dom.overlay.classList.add('overlay-help');
               dom.wrapper.appendChild(dom.overlay);
               var html = '<p class="title">Keyboard Shortcuts</p><br/>';
               html += '<table><th>KEY</th><th>ACTION</th>';
               for (var key in keyboardShortcuts) {
                    html += '<tr><td>' + key + '</td><td>' + keyboardShortcuts[key] + '</td></tr>'
               }
               for (var binding in registeredKeyBindings) {
                    if (registeredKeyBindings[binding].key && registeredKeyBindings[binding].description) {
                         html += '<tr><td>' + registeredKeyBindings[binding].key + '</td><td>' + registeredKeyBindings[binding].description + '</td></tr>'
                    }
               }
               html += '</table>';
               dom.overlay.innerHTML = ['<header>', '<a class="close" href="#"><span class="icon"></span></a>', '</header>', '<div class="viewport">', '<div class="viewport-inner">' + html + '</div>', '</div>'].join('');
               dom.overlay.querySelector('.close').addEventListener('click', function (event) {
                    closeOverlay();
                    event.preventDefault()
               }, !1);
               setTimeout(function () {
                    dom.overlay.classList.add('visible')
               }, 1)
          }
     }

     function closeOverlay() {
          if (dom.overlay) {
               dom.overlay.parentNode.removeChild(dom.overlay);
               dom.overlay = null
          }
     }

     function layout() {
          if (dom.wrapper && !isPrintingPDF()) {
               if (!config.disableLayout) {
                    if (isMobileDevice) {
                         document.documentElement.style.setProperty('--vh', (window.innerHeight * 0.01) + 'px')
                    }
                    var size = getComputedSlideSize();
                    var oldScale = scale;
                    layoutSlideContents(config.width, config.height);
                    dom.slides.style.width = size.width + 'px';
                    dom.slides.style.height = size.height + 'px';
                    scale = Math.min(size.presentationWidth / size.width, size.presentationHeight / size.height);
                    scale = Math.max(scale, config.minScale);
                    scale = Math.min(scale, config.maxScale);
                    if (scale === 1) {
                         dom.slides.style.zoom = '';
                         dom.slides.style.left = '';
                         dom.slides.style.top = '';
                         dom.slides.style.bottom = '';
                         dom.slides.style.right = '';
                         transformSlides({
                              layout: ''
                         })
                    } else {
                         if (scale > 1 && features.zoom) {
                              dom.slides.style.zoom = scale;
                              dom.slides.style.left = '';
                              dom.slides.style.top = '';
                              dom.slides.style.bottom = '';
                              dom.slides.style.right = '';
                              transformSlides({
                                   layout: ''
                              })
                         } else {
                              dom.slides.style.zoom = '';
                              dom.slides.style.left = '50%';
                              dom.slides.style.top = '50%';
                              dom.slides.style.bottom = 'auto';
                              dom.slides.style.right = 'auto';
                              transformSlides({
                                   layout: 'translate(-50%, -50%) scale(' + scale + ')'
                              })
                         }
                    }
                    var slides = toArray(dom.wrapper.querySelectorAll(SLIDES_SELECTOR));
                    for (var i = 0, len = slides.length; i < len; i++) {
                         var slide = slides[i];
                         if (slide.style.display === 'none') {
                              continue
                         }
                         if (config.center || slide.classList.contains('center')) {
                              if (slide.classList.contains('stack')) {
                                   slide.style.top = 0
                              } else {
                                   slide.style.top = Math.max((size.height - slide.scrollHeight) / 2, 0) + 'px'
                              }
                         } else {
                              slide.style.top = ''
                         }
                    }
                    if (oldScale !== scale) {
                         dispatchEvent('resize', {
                              'oldScale': oldScale,
                              'scale': scale,
                              'size': size
                         })
                    }
               }
               updateProgress();
               updateParallax();
               if (isOverview()) {
                    updateOverview()
               }
          }
     }

     function layoutSlideContents(width, height) {
          toArray(dom.slides.querySelectorAll('section > .stretch')).forEach(function (element) {
               var remainingHeight = getRemainingHeight(element, height);
               if (/(img|video)/gi.test(element.nodeName)) {
                    var nw = element.naturalWidth || element.videoWidth,
                         nh = element.naturalHeight || element.videoHeight;
                    var es = Math.min(width / nw, remainingHeight / nh);
                    element.style.width = (nw * es) + 'px';
                    element.style.height = (nh * es) + 'px'
               } else {
                    element.style.width = width + 'px';
                    element.style.height = remainingHeight + 'px'
               }
          })
     }

     function getComputedSlideSize(presentationWidth, presentationHeight) {
          var size = {
               width: config.width,
               height: config.height,
               presentationWidth: presentationWidth || dom.wrapper.offsetWidth,
               presentationHeight: presentationHeight || dom.wrapper.offsetHeight
          };
          size.presentationWidth -= (size.presentationWidth * config.margin);
          size.presentationHeight -= (size.presentationHeight * config.margin);
          if (typeof size.width === 'string' && /%$/.test(size.width)) {
               size.width = parseInt(size.width, 10) / 100 * size.presentationWidth
          }
          if (typeof size.height === 'string' && /%$/.test(size.height)) {
               size.height = parseInt(size.height, 10) / 100 * size.presentationHeight
          }
          return size
     }

     function setPreviousVerticalIndex(stack, v) {
          if (typeof stack === 'object' && typeof stack.setAttribute === 'function') {
               stack.setAttribute('data-previous-indexv', v || 0)
          }
     }

     function getPreviousVerticalIndex(stack) {
          if (typeof stack === 'object' && typeof stack.setAttribute === 'function' && stack.classList.contains('stack')) {
               var attributeName = stack.hasAttribute('data-start-indexv') ? 'data-start-indexv' : 'data-previous-indexv';
               return parseInt(stack.getAttribute(attributeName) || 0, 10)
          }
          return 0
     }

     function activateOverview() {
          if (config.overview && !isOverview()) {
               overview = !0;
               dom.wrapper.classList.add('overview');
               dom.wrapper.classList.remove('overview-deactivating');
               if (features.overviewTransitions) {
                    setTimeout(function () {
                         dom.wrapper.classList.add('overview-animated')
                    }, 1)
               }
               cancelAutoSlide();
               dom.slides.appendChild(dom.background);
               toArray(dom.wrapper.querySelectorAll(SLIDES_SELECTOR)).forEach(function (slide) {
                    if (!slide.classList.contains('stack')) {
                         slide.addEventListener('click', onOverviewSlideClicked, !0)
                    }
               });
               var margin = 70;
               var slideSize = getComputedSlideSize();
               overviewSlideWidth = slideSize.width + margin;
               overviewSlideHeight = slideSize.height + margin;
               if (config.rtl) {
                    overviewSlideWidth = -overviewSlideWidth
               }
               updateSlidesVisibility();
               layoutOverview();
               updateOverview();
               layout();
               dispatchEvent('overviewshown', {
                    'indexh': indexh,
                    'indexv': indexv,
                    'currentSlide': currentSlide
               })
          }
     }

     function layoutOverview() {
          toArray(dom.wrapper.querySelectorAll(HORIZONTAL_SLIDES_SELECTOR)).forEach(function (hslide, h) {
               hslide.setAttribute('data-index-h', h);
               transformElement(hslide, 'translate3d(' + (h * overviewSlideWidth) + 'px, 0, 0)');
               if (hslide.classList.contains('stack')) {
                    toArray(hslide.querySelectorAll('section')).forEach(function (vslide, v) {
                         vslide.setAttribute('data-index-h', h);
                         vslide.setAttribute('data-index-v', v);
                         transformElement(vslide, 'translate3d(0, ' + (v * overviewSlideHeight) + 'px, 0)')
                    })
               }
          });
          toArray(dom.background.childNodes).forEach(function (hbackground, h) {
               transformElement(hbackground, 'translate3d(' + (h * overviewSlideWidth) + 'px, 0, 0)');
               toArray(hbackground.querySelectorAll('.slide-background')).forEach(function (vbackground, v) {
                    transformElement(vbackground, 'translate3d(0, ' + (v * overviewSlideHeight) + 'px, 0)')
               })
          })
     }

     function updateOverview() {
          var vmin = Math.min(window.innerWidth, window.innerHeight);
          var scale = Math.max(vmin / 5, 150) / vmin;
          transformSlides({
               overview: ['scale(' + scale + ')', 'translateX(' + (-indexh * overviewSlideWidth) + 'px)', 'translateY(' + (-indexv * overviewSlideHeight) + 'px)'].join(' ')
          })
     }

     function deactivateOverview() {
          if (config.overview) {
               overview = !1;
               dom.wrapper.classList.remove('overview');
               dom.wrapper.classList.remove('overview-animated');
               dom.wrapper.classList.add('overview-deactivating');
               setTimeout(function () {
                    dom.wrapper.classList.remove('overview-deactivating')
               }, 1);
               dom.wrapper.appendChild(dom.background);
               toArray(dom.wrapper.querySelectorAll(SLIDES_SELECTOR)).forEach(function (slide) {
                    transformElement(slide, '');
                    slide.removeEventListener('click', onOverviewSlideClicked, !0)
               });
               toArray(dom.background.querySelectorAll('.slide-background')).forEach(function (background) {
                    transformElement(background, '')
               });
               transformSlides({
                    overview: ''
               });
               slide(indexh, indexv);
               layout();
               cueAutoSlide();
               dispatchEvent('overviewhidden', {
                    'indexh': indexh,
                    'indexv': indexv,
                    'currentSlide': currentSlide
               })
          }
     }

     function toggleOverview(override) {
          if (typeof override === 'boolean') {
               override ? activateOverview() : deactivateOverview()
          } else {
               isOverview() ? deactivateOverview() : activateOverview()
          }
     }

     function isOverview() {
          return overview
     }

     function locationHash() {
          var url = '/';
          var id = currentSlide ? currentSlide.getAttribute('id') : null;
          if (id) {
               id = encodeURIComponent(id)
          }
          var indexf;
          if (config.fragmentInURL) {
               indexf = getIndices().f
          }
          if (typeof id === 'string' && id.length && indexf === undefined) {
               url = '/' + id
          } else {
               var hashIndexBase = config.hashOneBasedIndex ? 1 : 0;
               if (indexh > 0 || indexv > 0 || indexf !== undefined) url += indexh + hashIndexBase;
               if (indexv > 0 || indexf !== undefined) url += '/' + (indexv + hashIndexBase);
               if (indexf !== undefined) url += '/' + indexf
          }
          return url
     }

     function isVerticalSlide(slide) {
          slide = slide ? slide : currentSlide;
          return slide && slide.parentNode && !!slide.parentNode.nodeName.match(/section/i)
     }

     function enterFullscreen() {
          var element = document.documentElement;
          var requestMethod = element.requestFullscreen || element.webkitRequestFullscreen || element.webkitRequestFullScreen || element.mozRequestFullScreen || element.msRequestFullscreen;
          if (requestMethod) {
               requestMethod.apply(element)
          }
     }

     function showCursor() {
          if (cursorHidden) {
               cursorHidden = !1;
               dom.wrapper.style.cursor = ''
          }
     }

     function hideCursor() {
          if (cursorHidden === !1) {
               cursorHidden = !0;
               dom.wrapper.style.cursor = 'none'
          }
     }

     function pause() {
          if (config.pause) {
               var wasPaused = dom.wrapper.classList.contains('paused');
               cancelAutoSlide();
               dom.wrapper.classList.add('paused');
               if (wasPaused === !1) {
                    dispatchEvent('paused')
               }
          }
     }

     function resume() {
          var wasPaused = dom.wrapper.classList.contains('paused');
          dom.wrapper.classList.remove('paused');
          cueAutoSlide();
          if (wasPaused) {
               dispatchEvent('resumed')
          }
     }

     function togglePause(override) {
          if (typeof override === 'boolean') {
               override ? pause() : resume()
          } else {
               isPaused() ? resume() : pause()
          }
     }

     function isPaused() {
          return dom.wrapper.classList.contains('paused')
     }

     function toggleAutoSlide(override) {
          if (typeof override === 'boolean') {
               override ? resumeAutoSlide() : pauseAutoSlide()
          } else {
               autoSlidePaused ? resumeAutoSlide() : pauseAutoSlide()
          }
     }

     function isAutoSliding() {
          return !!(autoSlide && !autoSlidePaused)
     }

     function slide(h, v, f, o) {
          previousSlide = currentSlide;
          var horizontalSlides = dom.wrapper.querySelectorAll(HORIZONTAL_SLIDES_SELECTOR);
          if (horizontalSlides.length === 0) return;
          if (v === undefined && !isOverview()) {
               v = getPreviousVerticalIndex(horizontalSlides[h])
          }
          if (previousSlide && previousSlide.parentNode && previousSlide.parentNode.classList.contains('stack')) {
               setPreviousVerticalIndex(previousSlide.parentNode, indexv)
          }
          var stateBefore = state.concat();
          state.length = 0;
          var indexhBefore = indexh || 0,
               indexvBefore = indexv || 0;
          indexh = updateSlides(HORIZONTAL_SLIDES_SELECTOR, h === undefined ? indexh : h);
          indexv = updateSlides(VERTICAL_SLIDES_SELECTOR, v === undefined ? indexv : v);
          updateSlidesVisibility();
          layout();
          if (isOverview()) {
               updateOverview()
          }
          var currentHorizontalSlide = horizontalSlides[indexh],
               currentVerticalSlides = currentHorizontalSlide.querySelectorAll('section');
          currentSlide = currentVerticalSlides[indexv] || currentHorizontalSlide;
          if (typeof f !== 'undefined') {
               navigateFragment(f)
          }
          var slideChanged = (indexh !== indexhBefore || indexv !== indexvBefore);
          if (!slideChanged) {
               previousSlide = null
          }
          if (previousSlide && previousSlide !== currentSlide) {
               previousSlide.classList.remove('present');
               previousSlide.setAttribute('aria-hidden', 'true');
               if (dom.wrapper.querySelector(HOME_SLIDE_SELECTOR).classList.contains('present')) {
                    setTimeout(function () {
                         var slides = toArray(dom.wrapper.querySelectorAll(HORIZONTAL_SLIDES_SELECTOR + '.stack')),
                              i;
                         for (i in slides) {
                              if (slides[i]) {
                                   setPreviousVerticalIndex(slides[i], 0)
                              }
                         }
                    }, 0)
               }
          }
          stateLoop: for (var i = 0, len = state.length; i < len; i++) {
               for (var j = 0; j < stateBefore.length; j++) {
                    if (stateBefore[j] === state[i]) {
                         stateBefore.splice(j, 1);
                         continue stateLoop
                    }
               }
               document.documentElement.classList.add(state[i]);
               dispatchEvent(state[i])
          }
          while (stateBefore.length) {
               document.documentElement.classList.remove(stateBefore.pop())
          }
          if (slideChanged) {
               dispatchEvent('slidechanged', {
                    'indexh': indexh,
                    'indexv': indexv,
                    'previousSlide': previousSlide,
                    'currentSlide': currentSlide,
                    'origin': o
               })
          }
          if (slideChanged || !previousSlide) {
               stopEmbeddedContent(previousSlide);
               startEmbeddedContent(currentSlide)
          }
          dom.statusDiv.textContent = getStatusText(currentSlide);
          updateControls();
          updateProgress();
          updateBackground();
          updateParallax();
          updateSlideNumber();
          updateNotes();
          updateFragments();
          writeURL();
          cueAutoSlide()
     }

     function sync() {
          removeEventListeners();
          addEventListeners();
          layout();
          autoSlide = config.autoSlide;
          cueAutoSlide();
          createBackgrounds();
          writeURL();
          sortAllFragments();
          updateControls();
          updateProgress();
          updateSlideNumber();
          updateSlidesVisibility();
          updateBackground(!0);
          updateNotesVisibility();
          updateNotes();
          formatEmbeddedContent();
          if (config.autoPlayMedia === !1) {
               stopEmbeddedContent(currentSlide, {
                    unloadIframes: !1
               })
          } else {
               startEmbeddedContent(currentSlide)
          }
          if (isOverview()) {
               layoutOverview()
          }
     }

     function syncSlide(slide) {
          slide = slide || currentSlide;
          syncBackground(slide);
          syncFragments(slide);
          updateBackground();
          updateNotes();
          loadSlide(slide)
     }

     function syncFragments(slide) {
          slide = slide || currentSlide;
          return sortFragments(slide.querySelectorAll('.fragment'))
     }

     function resetVerticalSlides() {
          var horizontalSlides = toArray(dom.wrapper.querySelectorAll(HORIZONTAL_SLIDES_SELECTOR));
          horizontalSlides.forEach(function (horizontalSlide) {
               var verticalSlides = toArray(horizontalSlide.querySelectorAll('section'));
               verticalSlides.forEach(function (verticalSlide, y) {
                    if (y > 0) {
                         verticalSlide.classList.remove('present');
                         verticalSlide.classList.remove('past');
                         verticalSlide.classList.add('future');
                         verticalSlide.setAttribute('aria-hidden', 'true')
                    }
               })
          })
     }

     function sortAllFragments() {
          var horizontalSlides = toArray(dom.wrapper.querySelectorAll(HORIZONTAL_SLIDES_SELECTOR));
          horizontalSlides.forEach(function (horizontalSlide) {
               var verticalSlides = toArray(horizontalSlide.querySelectorAll('section'));
               verticalSlides.forEach(function (verticalSlide, y) {
                    sortFragments(verticalSlide.querySelectorAll('.fragment'))
               });
               if (verticalSlides.length === 0) sortFragments(horizontalSlide.querySelectorAll('.fragment'))
          })
     }

     function shuffle() {
          var slides = toArray(dom.wrapper.querySelectorAll(HORIZONTAL_SLIDES_SELECTOR));
          slides.forEach(function (slide) {
               dom.slides.insertBefore(slide, slides[Math.floor(Math.random() * slides.length)])
          })
     }

     function updateSlides(selector, index) {
          var slides = toArray(dom.wrapper.querySelectorAll(selector)),
               slidesLength = slides.length;
          var printMode = isPrintingPDF();
          if (slidesLength) {
               if (config.loop) {
                    index %= slidesLength;
                    if (index < 0) {
                         index = slidesLength + index
                    }
               }
               index = Math.max(Math.min(index, slidesLength - 1), 0);
               for (var i = 0; i < slidesLength; i++) {
                    var element = slides[i];
                    var reverse = config.rtl && !isVerticalSlide(element);
                    element.classList.remove('past');
                    element.classList.remove('present');
                    element.classList.remove('future');
                    element.setAttribute('hidden', '');
                    element.setAttribute('aria-hidden', 'true');
                    if (element.querySelector('section')) {
                         element.classList.add('stack')
                    }
                    if (printMode) {
                         element.classList.add('present');
                         continue
                    }
                    if (i < index) {
                         element.classList.add(reverse ? 'future' : 'past');
                         if (config.fragments) {
                              toArray(element.querySelectorAll('.fragment')).forEach(function (fragment) {
                                   fragment.classList.add('visible');
                                   fragment.classList.remove('current-fragment')
                              })
                         }
                    } else if (i > index) {
                         element.classList.add(reverse ? 'past' : 'future');
                         if (config.fragments) {
                              toArray(element.querySelectorAll('.fragment.visible')).forEach(function (fragment) {
                                   fragment.classList.remove('visible');
                                   fragment.classList.remove('current-fragment')
                              })
                         }
                    }
               }
               slides[index].classList.add('present');
               slides[index].removeAttribute('hidden');
               slides[index].removeAttribute('aria-hidden');
               var slideState = slides[index].getAttribute('data-state');
               if (slideState) {
                    state = state.concat(slideState.split(' '))
               }
          } else {
               index = 0
          }
          return index
     }

     function updateSlidesVisibility() {
          var horizontalSlides = toArray(dom.wrapper.querySelectorAll(HORIZONTAL_SLIDES_SELECTOR)),
               horizontalSlidesLength = horizontalSlides.length,
               distanceX, distanceY;
          if (horizontalSlidesLength && typeof indexh !== 'undefined') {
               var viewDistance = isOverview() ? 10 : config.viewDistance;
               if (isMobileDevice) {
                    viewDistance = isOverview() ? 6 : 2
               }
               if (isPrintingPDF()) {
                    viewDistance = Number.MAX_VALUE
               }
               for (var x = 0; x < horizontalSlidesLength; x++) {
                    var horizontalSlide = horizontalSlides[x];
                    var verticalSlides = toArray(horizontalSlide.querySelectorAll('section')),
                         verticalSlidesLength = verticalSlides.length;
                    distanceX = Math.abs((indexh || 0) - x) || 0;
                    if (config.loop) {
                         distanceX = Math.abs(((indexh || 0) - x) % (horizontalSlidesLength - viewDistance)) || 0
                    }
                    if (distanceX < viewDistance) {
                         loadSlide(horizontalSlide)
                    } else {
                         unloadSlide(horizontalSlide)
                    }
                    if (verticalSlidesLength) {
                         var oy = getPreviousVerticalIndex(horizontalSlide);
                         for (var y = 0; y < verticalSlidesLength; y++) {
                              var verticalSlide = verticalSlides[y];
                              distanceY = x === (indexh || 0) ? Math.abs((indexv || 0) - y) : Math.abs(y - oy);
                              if (distanceX + distanceY < viewDistance) {
                                   loadSlide(verticalSlide)
                              } else {
                                   unloadSlide(verticalSlide)
                              }
                         }
                    }
               }
               if (dom.wrapper.querySelectorAll('.slides>section>section').length) {
                    dom.wrapper.classList.add('has-vertical-slides')
               } else {
                    dom.wrapper.classList.remove('has-vertical-slides')
               }
               if (dom.wrapper.querySelectorAll('.slides>section').length > 1) {
                    dom.wrapper.classList.add('has-horizontal-slides')
               } else {
                    dom.wrapper.classList.remove('has-horizontal-slides')
               }
          }
     }

     function updateNotes() {
          if (config.showNotes && dom.speakerNotes && currentSlide && !isPrintingPDF()) {
               dom.speakerNotes.innerHTML = getSlideNotes() || '<span class="notes-placeholder">No notes on this slide.</span>'
          }
     }

     function updateNotesVisibility() {
          if (config.showNotes && hasNotes()) {
               dom.wrapper.classList.add('show-notes')
          } else {
               dom.wrapper.classList.remove('show-notes')
          }
     }

     function hasNotes() {
          return dom.slides.querySelectorAll('[data-notes], aside.notes').length > 0
     }

     function updateProgress() {
          if (config.progress && dom.progressbar) {
               dom.progressbar.style.width = getProgress() * dom.wrapper.offsetWidth + 'px'
          }
     }

     function updateSlideNumber() {
          if (config.slideNumber && dom.slideNumber) {
               var value;
               var format = 'h.v';
               if (typeof config.slideNumber === 'function') {
                    value = config.slideNumber()
               } else {
                    if (typeof config.slideNumber === 'string') {
                         format = config.slideNumber
                    }
                    if (!/c/.test(format) && dom.wrapper.querySelectorAll(HORIZONTAL_SLIDES_SELECTOR).length === 1) {
                         format = 'c'
                    }
                    value = [];
                    switch (format) {
                         case 'c':
                              value.push(getSlidePastCount() + 1);
                              break;
                         case 'c/t':
                              value.push(getSlidePastCount() + 1, '/', getTotalSlides());
                              break;
                         case 'h/v':
                              value.push(indexh + 1);
                              if (isVerticalSlide()) value.push('/', indexv + 1);
                              break;
                         default:
                              value.push(indexh + 1);
                              if (isVerticalSlide()) value.push('.', indexv + 1)
                    }
               }
               dom.slideNumber.innerHTML = formatSlideNumber(value[0], value[1], value[2])
          }
     }

     function formatSlideNumber(a, delimiter, b) {
          var url = '#' + locationHash();
          if (typeof b === 'number' && !isNaN(b)) {
               return '<a href="' + url + '">' + '<span class="slide-number-a">' + a + '</span>' + '<span class="slide-number-delimiter">' + delimiter + '</span>' + '<span class="slide-number-b">' + b + '</span>' + '</a>'
          } else {
               return '<a href="' + url + '">' + '<span class="slide-number-a">' + a + '</span>' + '</a>'
          }
     }

     function updateControls() {
          var routes = availableRoutes();
          var fragments = availableFragments();
          dom.controlsLeft.concat(dom.controlsRight).concat(dom.controlsUp).concat(dom.controlsDown).concat(dom.controlsPrev).concat(dom.controlsNext).forEach(function (node) {
               node.classList.remove('enabled');
               node.classList.remove('fragmented');
               node.setAttribute('disabled', 'disabled')
          });
          if (routes.left) dom.controlsLeft.forEach(function (el) {
               el.classList.add('enabled');
               el.removeAttribute('disabled')
          });
          if (routes.right) dom.controlsRight.forEach(function (el) {
               el.classList.add('enabled');
               el.removeAttribute('disabled')
          });
          if (routes.up) dom.controlsUp.forEach(function (el) {
               el.classList.add('enabled');
               el.removeAttribute('disabled')
          });
          if (routes.down) dom.controlsDown.forEach(function (el) {
               el.classList.add('enabled');
               el.removeAttribute('disabled')
          });
          if (routes.left || routes.up) dom.controlsPrev.forEach(function (el) {
               el.classList.add('enabled');
               el.removeAttribute('disabled')
          });
          if (routes.right || routes.down) dom.controlsNext.forEach(function (el) {
               el.classList.add('enabled');
               el.removeAttribute('disabled')
          });
          if (currentSlide) {
               if (fragments.prev) dom.controlsPrev.forEach(function (el) {
                    el.classList.add('fragmented', 'enabled');
                    el.removeAttribute('disabled')
               });
               if (fragments.next) dom.controlsNext.forEach(function (el) {
                    el.classList.add('fragmented', 'enabled');
                    el.removeAttribute('disabled')
               });
               if (isVerticalSlide(currentSlide)) {
                    if (fragments.prev) dom.controlsUp.forEach(function (el) {
                         el.classList.add('fragmented', 'enabled');
                         el.removeAttribute('disabled')
                    });
                    if (fragments.next) dom.controlsDown.forEach(function (el) {
                         el.classList.add('fragmented', 'enabled');
                         el.removeAttribute('disabled')
                    })
               } else {
                    if (fragments.prev) dom.controlsLeft.forEach(function (el) {
                         el.classList.add('fragmented', 'enabled');
                         el.removeAttribute('disabled')
                    });
                    if (fragments.next) dom.controlsRight.forEach(function (el) {
                         el.classList.add('fragmented', 'enabled');
                         el.removeAttribute('disabled')
                    })
               }
          }
          if (config.controlsTutorial) {
               if (!hasNavigatedDown && routes.down) {
                    dom.controlsDownArrow.classList.add('highlight')
               } else {
                    dom.controlsDownArrow.classList.remove('highlight');
                    if (!hasNavigatedRight && routes.right && indexv === 0) {
                         dom.controlsRightArrow.classList.add('highlight')
                    } else {
                         dom.controlsRightArrow.classList.remove('highlight')
                    }
               }
          }
     }

     function updateBackground(includeAll) {
          var currentBackground = null;
          var horizontalPast = config.rtl ? 'future' : 'past',
               horizontalFuture = config.rtl ? 'past' : 'future';
          toArray(dom.background.childNodes).forEach(function (backgroundh, h) {
               backgroundh.classList.remove('past');
               backgroundh.classList.remove('present');
               backgroundh.classList.remove('future');
               if (h < indexh) {
                    backgroundh.classList.add(horizontalPast)
               } else if (h > indexh) {
                    backgroundh.classList.add(horizontalFuture)
               } else {
                    backgroundh.classList.add('present');
                    currentBackground = backgroundh
               }
               if (includeAll || h === indexh) {
                    toArray(backgroundh.querySelectorAll('.slide-background')).forEach(function (backgroundv, v) {
                         backgroundv.classList.remove('past');
                         backgroundv.classList.remove('present');
                         backgroundv.classList.remove('future');
                         if (v < indexv) {
                              backgroundv.classList.add('past')
                         } else if (v > indexv) {
                              backgroundv.classList.add('future')
                         } else {
                              backgroundv.classList.add('present');
                              if (h === indexh) currentBackground = backgroundv
                         }
                    })
               }
          });
          if (previousBackground) {
               stopEmbeddedContent(previousBackground)
          }
          if (currentBackground) {
               startEmbeddedContent(currentBackground);
               var currentBackgroundContent = currentBackground.querySelector('.slide-background-content');
               if (currentBackgroundContent) {
                    var backgroundImageURL = currentBackgroundContent.style.backgroundImage || '';
                    if (/\.gif/i.test(backgroundImageURL)) {
                         currentBackgroundContent.style.backgroundImage = '';
                         window.getComputedStyle(currentBackgroundContent).opacity;
                         currentBackgroundContent.style.backgroundImage = backgroundImageURL
                    }
               }
               var previousBackgroundHash = previousBackground ? previousBackground.getAttribute('data-background-hash') : null;
               var currentBackgroundHash = currentBackground.getAttribute('data-background-hash');
               if (currentBackgroundHash && currentBackgroundHash === previousBackgroundHash && currentBackground !== previousBackground) {
                    dom.background.classList.add('no-transition')
               }
               previousBackground = currentBackground
          }
          if (currentSlide) {
               ['has-light-background', 'has-dark-background'].forEach(function (classToBubble) {
                    if (currentSlide.classList.contains(classToBubble)) {
                         dom.wrapper.classList.add(classToBubble)
                    } else {
                         dom.wrapper.classList.remove(classToBubble)
                    }
               })
          }
          setTimeout(function () {
               dom.background.classList.remove('no-transition')
          }, 1)
     }

     function updateParallax() {
          if (config.parallaxBackgroundImage) {
               var horizontalSlides = dom.wrapper.querySelectorAll(HORIZONTAL_SLIDES_SELECTOR),
                    verticalSlides = dom.wrapper.querySelectorAll(VERTICAL_SLIDES_SELECTOR);
               var backgroundSize = dom.background.style.backgroundSize.split(' '),
                    backgroundWidth, backgroundHeight;
               if (backgroundSize.length === 1) {
                    backgroundWidth = backgroundHeight = parseInt(backgroundSize[0], 10)
               } else {
                    backgroundWidth = parseInt(backgroundSize[0], 10);
                    backgroundHeight = parseInt(backgroundSize[1], 10)
               }
               var slideWidth = dom.background.offsetWidth,
                    horizontalSlideCount = horizontalSlides.length,
                    horizontalOffsetMultiplier, horizontalOffset;
               if (typeof config.parallaxBackgroundHorizontal === 'number') {
                    horizontalOffsetMultiplier = config.parallaxBackgroundHorizontal
               } else {
                    horizontalOffsetMultiplier = horizontalSlideCount > 1 ? (backgroundWidth - slideWidth) / (horizontalSlideCount - 1) : 0
               }
               horizontalOffset = horizontalOffsetMultiplier * indexh * -1;
               var slideHeight = dom.background.offsetHeight,
                    verticalSlideCount = verticalSlides.length,
                    verticalOffsetMultiplier, verticalOffset;
               if (typeof config.parallaxBackgroundVertical === 'number') {
                    verticalOffsetMultiplier = config.parallaxBackgroundVertical
               } else {
                    verticalOffsetMultiplier = (backgroundHeight - slideHeight) / (verticalSlideCount - 1)
               }
               verticalOffset = verticalSlideCount > 0 ? verticalOffsetMultiplier * indexv : 0;
               dom.background.style.backgroundPosition = horizontalOffset + 'px ' + -verticalOffset + 'px'
          }
     }

     function shouldPreload(element) {
          var preload = config.preloadIframes;
          if (typeof preload !== 'boolean') {
               preload = element.hasAttribute('data-preload')
          }
          return preload
     }

     function loadSlide(slide, options) {
          options = options || {};
          slide.style.display = config.display;
          toArray(slide.querySelectorAll('img[data-src], video[data-src], audio[data-src], iframe[data-src]')).forEach(function (element) {
               if (element.tagName !== 'IFRAME' || shouldPreload(element)) {
                    element.setAttribute('src', element.getAttribute('data-src'));
                    element.setAttribute('data-lazy-loaded', '');
                    element.removeAttribute('data-src')
               }
          });
          toArray(slide.querySelectorAll('video, audio')).forEach(function (media) {
               var sources = 0;
               toArray(media.querySelectorAll('source[data-src]')).forEach(function (source) {
                    source.setAttribute('src', source.getAttribute('data-src'));
                    source.removeAttribute('data-src');
                    source.setAttribute('data-lazy-loaded', '');
                    sources += 1
               });
               if (sources > 0) {
                    media.load()
               }
          });
          var background = slide.slideBackgroundElement;
          if (background) {
               background.style.display = 'block';
               var backgroundContent = slide.slideBackgroundContentElement;
               if (background.hasAttribute('data-loaded') === !1) {
                    background.setAttribute('data-loaded', 'true');
                    var backgroundImage = slide.getAttribute('data-background-image'),
                         backgroundVideo = slide.getAttribute('data-background-video'),
                         backgroundVideoLoop = slide.hasAttribute('data-background-video-loop'),
                         backgroundVideoMuted = slide.hasAttribute('data-background-video-muted'),
                         backgroundIframe = slide.getAttribute('data-background-iframe');
                    if (backgroundImage) {
                         backgroundContent.style.backgroundImage = 'url(' + encodeURI(backgroundImage) + ')'
                    } else if (backgroundVideo && !isSpeakerNotes()) {
                         var video = document.createElement('video');
                         if (backgroundVideoLoop) {
                              video.setAttribute('loop', '')
                         }
                         if (backgroundVideoMuted) {
                              video.muted = !0
                         }
                         if (isMobileDevice) {
                              video.muted = !0;
                              video.autoplay = !0;
                              video.setAttribute('playsinline', '')
                         }
                         backgroundVideo.split(',').forEach(function (source) {
                              video.innerHTML += '<source src="' + source + '">'
                         });
                         backgroundContent.appendChild(video)
                    } else if (backgroundIframe && options.excludeIframes !== !0) {
                         var iframe = document.createElement('iframe');
                         iframe.setAttribute('allowfullscreen', '');
                         iframe.setAttribute('mozallowfullscreen', '');
                         iframe.setAttribute('webkitallowfullscreen', '');
                         if (/autoplay=(1|true|yes)/gi.test(backgroundIframe)) {
                              iframe.setAttribute('data-src', backgroundIframe)
                         } else {
                              iframe.setAttribute('src', backgroundIframe)
                         }
                         iframe.style.width = '100%';
                         iframe.style.height = '100%';
                         iframe.style.maxHeight = '100%';
                         iframe.style.maxWidth = '100%';
                         backgroundContent.appendChild(iframe)
                    }
               }
          }
     }

     function unloadSlide(slide) {
          slide.style.display = 'none';
          var background = getSlideBackground(slide);
          if (background) {
               background.style.display = 'none'
          }
          toArray(slide.querySelectorAll('video[data-lazy-loaded][src], audio[data-lazy-loaded][src], iframe[data-lazy-loaded][src]')).forEach(function (element) {
               element.setAttribute('data-src', element.getAttribute('src'));
               element.removeAttribute('src')
          });
          toArray(slide.querySelectorAll('video[data-lazy-loaded] source[src], audio source[src]')).forEach(function (source) {
               source.setAttribute('data-src', source.getAttribute('src'));
               source.removeAttribute('src')
          })
     }

     function availableRoutes() {
          var horizontalSlides = dom.wrapper.querySelectorAll(HORIZONTAL_SLIDES_SELECTOR),
               verticalSlides = dom.wrapper.querySelectorAll(VERTICAL_SLIDES_SELECTOR);
          var routes = {
               left: indexh > 0,
               right: indexh < horizontalSlides.length - 1,
               up: indexv > 0,
               down: indexv < verticalSlides.length - 1
          };
          if (config.loop) {
               if (horizontalSlides.length > 1) {
                    routes.left = !0;
                    routes.right = !0
               }
               if (verticalSlides.length > 1) {
                    routes.up = !0;
                    routes.down = !0
               }
          }
          if (config.rtl) {
               var left = routes.left;
               routes.left = routes.right;
               routes.right = left
          }
          return routes
     }

     function availableFragments() {
          if (currentSlide && config.fragments) {
               var fragments = currentSlide.querySelectorAll('.fragment');
               var hiddenFragments = currentSlide.querySelectorAll('.fragment:not(.visible)');
               return {
                    prev: fragments.length - hiddenFragments.length > 0,
                    next: !!hiddenFragments.length
               }
          } else {
               return {
                    prev: !1,
                    next: !1
               }
          }
     }

     function formatEmbeddedContent() {
          var _appendParamToIframeSource = function (sourceAttribute, sourceURL, param) {
               toArray(dom.slides.querySelectorAll('iframe[' + sourceAttribute + '*="' + sourceURL + '"]')).forEach(function (el) {
                    var src = el.getAttribute(sourceAttribute);
                    if (src && src.indexOf(param) === -1) {
                         el.setAttribute(sourceAttribute, src + (!/\?/.test(src) ? '?' : '&') + param)
                    }
               })
          };
          _appendParamToIframeSource('src', 'youtube.com/embed/', 'enablejsapi=1');
          _appendParamToIframeSource('data-src', 'youtube.com/embed/', 'enablejsapi=1');
          _appendParamToIframeSource('src', 'player.vimeo.com/', 'api=1');
          _appendParamToIframeSource('data-src', 'player.vimeo.com/', 'api=1')
     }

     function startEmbeddedContent(element) {
          if (element && !isSpeakerNotes()) {
               toArray(element.querySelectorAll('img[src$=".gif"]')).forEach(function (el) {
                    el.setAttribute('src', el.getAttribute('src'))
               });
               toArray(element.querySelectorAll('video, audio')).forEach(function (el) {
                    if (closestParent(el, '.fragment') && !closestParent(el, '.fragment.visible')) {
                         return
                    }
                    var autoplay = config.autoPlayMedia;
                    if (typeof autoplay !== 'boolean') {
                         autoplay = el.hasAttribute('data-autoplay') || !!closestParent(el, '.slide-background')
                    }
                    if (autoplay && typeof el.play === 'function') {
                         if (el.readyState > 1) {
                              startEmbeddedMedia({
                                   target: el
                              })
                         } else if (isMobileDevice) {
                              var promise = el.play();
                              if (promise && typeof promise.catch === 'function' && el.controls === !1) {
                                   promise.catch(function () {
                                        el.controls = !0;
                                        el.addEventListener('play', function () {
                                             el.controls = !1
                                        })
                                   })
                              }
                         } else {
                              el.removeEventListener('loadeddata', startEmbeddedMedia);
                              el.addEventListener('loadeddata', startEmbeddedMedia)
                         }
                    }
               });
               toArray(element.querySelectorAll('iframe[src]')).forEach(function (el) {
                    if (closestParent(el, '.fragment') && !closestParent(el, '.fragment.visible')) {
                         return
                    }
                    startEmbeddedIframe({
                         target: el
                    })
               });
               toArray(element.querySelectorAll('iframe[data-src]')).forEach(function (el) {
                    if (closestParent(el, '.fragment') && !closestParent(el, '.fragment.visible')) {
                         return
                    }
                    if (el.getAttribute('src') !== el.getAttribute('data-src')) {
                         el.removeEventListener('load', startEmbeddedIframe);
                         el.addEventListener('load', startEmbeddedIframe);
                         el.setAttribute('src', el.getAttribute('data-src'))
                    }
               })
          }
     }

     function startEmbeddedMedia(event) {
          var isAttachedToDOM = !!closestParent(event.target, 'html'),
               isVisible = !!closestParent(event.target, '.present');
          if (isAttachedToDOM && isVisible) {
               event.target.currentTime = 0;
               event.target.play()
          }
          event.target.removeEventListener('loadeddata', startEmbeddedMedia)
     }

     function startEmbeddedIframe(event) {
          var iframe = event.target;
          if (iframe && iframe.contentWindow) {
               var isAttachedToDOM = !!closestParent(event.target, 'html'),
                    isVisible = !!closestParent(event.target, '.present');
               if (isAttachedToDOM && isVisible) {
                    var autoplay = config.autoPlayMedia;
                    if (typeof autoplay !== 'boolean') {
                         autoplay = iframe.hasAttribute('data-autoplay') || !!closestParent(iframe, '.slide-background')
                    }
                    if (/youtube\.com\/embed\//.test(iframe.getAttribute('src')) && autoplay) {
                         iframe.contentWindow.postMessage('{"event":"command","func":"playVideo","args":""}', '*')
                    } else if (/player\.vimeo\.com\//.test(iframe.getAttribute('src')) && autoplay) {
                         iframe.contentWindow.postMessage('{"method":"play"}', '*')
                    } else {
                         iframe.contentWindow.postMessage('slide:start', '*')
                    }
               }
          }
     }

     function stopEmbeddedContent(element, options) {
          options = extend({
               unloadIframes: !0
          }, options || {});
          if (element && element.parentNode) {
               toArray(element.querySelectorAll('video, audio')).forEach(function (el) {
                    if (!el.hasAttribute('data-ignore') && typeof el.pause === 'function') {
                         el.setAttribute('data-paused-by-reveal', '');
                         el.pause()
                    }
               });
               toArray(element.querySelectorAll('iframe')).forEach(function (el) {
                    if (el.contentWindow) el.contentWindow.postMessage('slide:stop', '*');
                    el.removeEventListener('load', startEmbeddedIframe)
               });
               toArray(element.querySelectorAll('iframe[src*="youtube.com/embed/"]')).forEach(function (el) {
                    if (!el.hasAttribute('data-ignore') && el.contentWindow && typeof el.contentWindow.postMessage === 'function') {
                         el.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*')
                    }
               });
               toArray(element.querySelectorAll('iframe[src*="player.vimeo.com/"]')).forEach(function (el) {
                    if (!el.hasAttribute('data-ignore') && el.contentWindow && typeof el.contentWindow.postMessage === 'function') {
                         el.contentWindow.postMessage('{"method":"pause"}', '*')
                    }
               });
               if (options.unloadIframes === !0) {
                    toArray(element.querySelectorAll('iframe[data-src]')).forEach(function (el) {
                         el.setAttribute('src', 'about:blank');
                         el.removeAttribute('src')
                    })
               }
          }
     }

     function getSlidePastCount() {
          var horizontalSlides = toArray(dom.wrapper.querySelectorAll(HORIZONTAL_SLIDES_SELECTOR));
          var pastCount = 0;
          mainLoop: for (var i = 0; i < horizontalSlides.length; i++) {
               var horizontalSlide = horizontalSlides[i];
               var verticalSlides = toArray(horizontalSlide.querySelectorAll('section'));
               for (var j = 0; j < verticalSlides.length; j++) {
                    if (verticalSlides[j].classList.contains('present')) {
                         break mainLoop
                    }
                    pastCount++
               }
               if (horizontalSlide.classList.contains('present')) {
                    break
               }
               if (horizontalSlide.classList.contains('stack') === !1) {
                    pastCount++
               }
          }
          return pastCount
     }

     function getProgress() {
          var totalCount = getTotalSlides();
          var pastCount = getSlidePastCount();
          if (currentSlide) {
               var allFragments = currentSlide.querySelectorAll('.fragment');
               if (allFragments.length > 0) {
                    var visibleFragments = currentSlide.querySelectorAll('.fragment.visible');
                    var fragmentWeight = 0.9;
                    pastCount += (visibleFragments.length / allFragments.length) * fragmentWeight
               }
          }
          return Math.min(pastCount / (totalCount - 1), 1)
     }

     function isSpeakerNotes() {
          return !!window.location.search.match(/receiver/gi)
     }

     function readURL() {
          var hash = window.location.hash;
          var bits = hash.slice(2).split('/'),
               name = hash.replace(/#|\//gi, '');
          if (!/^[0-9]*$/.test(bits[0]) && name.length) {
               var element;
               try {
                    element = document.getElementById(decodeURIComponent(name))
               } catch (error) { }
               var isSameNameAsCurrentSlide = currentSlide ? currentSlide.getAttribute('id') === name : !1;
               if (element) {
                    if (!isSameNameAsCurrentSlide) {
                         var indices = Reveal.getIndices(element);
                         slide(indices.h, indices.v)
                    }
               } else {
                    slide(indexh || 0, indexv || 0)
               }
          } else {
               var hashIndexBase = config.hashOneBasedIndex ? 1 : 0;
               var h = (parseInt(bits[0], 10) - hashIndexBase) || 0,
                    v = (parseInt(bits[1], 10) - hashIndexBase) || 0,
                    f;
               if (config.fragmentInURL) {
                    f = parseInt(bits[2], 10);
                    if (isNaN(f)) {
                         f = undefined
                    }
               }
               if (h !== indexh || v !== indexv || f !== undefined) {
                    slide(h, v, f)
               }
          }
     }

     function writeURL(delay) {
          clearTimeout(writeURLTimeout);
          if (typeof delay === 'number') {
               writeURLTimeout = setTimeout(writeURL, delay)
          } else if (currentSlide) {
               if (config.history || !window.history) {
                    window.location.hash = locationHash()
               } else if (config.hash) {
                    window.history.replaceState(null, null, '#' + locationHash())
               } else {
                    window.history.replaceState(null, null, window.location.pathname + window.location.search)
               }
          }
     }

     function getIndices(slide) {
          var h = indexh,
               v = indexv,
               f;
          if (slide) {
               var isVertical = isVerticalSlide(slide);
               var slideh = isVertical ? slide.parentNode : slide;
               var horizontalSlides = toArray(dom.wrapper.querySelectorAll(HORIZONTAL_SLIDES_SELECTOR));
               h = Math.max(horizontalSlides.indexOf(slideh), 0);
               v = undefined;
               if (isVertical) {
                    v = Math.max(toArray(slide.parentNode.querySelectorAll('section')).indexOf(slide), 0)
               }
          }
          if (!slide && currentSlide) {
               var hasFragments = currentSlide.querySelectorAll('.fragment').length > 0;
               if (hasFragments) {
                    var currentFragment = currentSlide.querySelector('.current-fragment');
                    if (currentFragment && currentFragment.hasAttribute('data-fragment-index')) {
                         f = parseInt(currentFragment.getAttribute('data-fragment-index'), 10)
                    } else {
                         f = currentSlide.querySelectorAll('.fragment.visible').length - 1
                    }
               }
          }
          return {
               h: h,
               v: v,
               f: f
          }
     }

     function getSlides() {
          return toArray(dom.wrapper.querySelectorAll(SLIDES_SELECTOR + ':not(.stack)'))
     }

     function getSlidesAttributes() {
          return getSlides().map(function (slide) {
               var attributes = {};
               for (var i = 0; i < slide.attributes.length; i++) {
                    var attribute = slide.attributes[i];
                    attributes[attribute.name] = attribute.value
               }
               return attributes
          })
     }

     function getTotalSlides() {
          return getSlides().length
     }

     function getSlide(x, y) {
          var horizontalSlide = dom.wrapper.querySelectorAll(HORIZONTAL_SLIDES_SELECTOR)[x];
          var verticalSlides = horizontalSlide && horizontalSlide.querySelectorAll('section');
          if (verticalSlides && verticalSlides.length && typeof y === 'number') {
               return verticalSlides ? verticalSlides[y] : undefined
          }
          return horizontalSlide
     }

     function getSlideBackground(x, y) {
          var slide = typeof x === 'number' ? getSlide(x, y) : x;
          if (slide) {
               return slide.slideBackgroundElement
          }
          return undefined
     }

     function getSlideNotes(slide) {
          slide = slide || currentSlide;
          if (slide.hasAttribute('data-notes')) {
               return slide.getAttribute('data-notes')
          }
          var notesElement = slide.querySelector('aside.notes');
          if (notesElement) {
               return notesElement.innerHTML
          }
          return null
     }

     function getState() {
          var indices = getIndices();
          return {
               indexh: indices.h,
               indexv: indices.v,
               indexf: indices.f,
               paused: isPaused(),
               overview: isOverview()
          }
     }

     function setState(state) {
          if (typeof state === 'object') {
               slide(deserialize(state.indexh), deserialize(state.indexv), deserialize(state.indexf));
               var pausedFlag = deserialize(state.paused),
                    overviewFlag = deserialize(state.overview);
               if (typeof pausedFlag === 'boolean' && pausedFlag !== isPaused()) {
                    togglePause(pausedFlag)
               }
               if (typeof overviewFlag === 'boolean' && overviewFlag !== isOverview()) {
                    toggleOverview(overviewFlag)
               }
          }
     }

     function sortFragments(fragments, grouped) {
          fragments = toArray(fragments);
          var ordered = [],
               unordered = [],
               sorted = [];
          fragments.forEach(function (fragment, i) {
               if (fragment.hasAttribute('data-fragment-index')) {
                    var index = parseInt(fragment.getAttribute('data-fragment-index'), 10);
                    if (!ordered[index]) {
                         ordered[index] = []
                    }
                    ordered[index].push(fragment)
               } else {
                    unordered.push([fragment])
               }
          });
          ordered = ordered.concat(unordered);
          var index = 0;
          ordered.forEach(function (group) {
               group.forEach(function (fragment) {
                    sorted.push(fragment);
                    fragment.setAttribute('data-fragment-index', index)
               });
               index++
          });
          return grouped === !0 ? ordered : sorted
     }

     function updateFragments(index, fragments) {
          var changedFragments = {
               shown: [],
               hidden: []
          };
          if (currentSlide && config.fragments) {
               fragments = fragments || sortFragments(currentSlide.querySelectorAll('.fragment'));
               if (fragments.length) {
                    if (typeof index !== 'number') {
                         var currentFragment = sortFragments(currentSlide.querySelectorAll('.fragment.visible')).pop();
                         if (currentFragment) {
                              index = parseInt(currentFragment.getAttribute('data-fragment-index') || 0, 10)
                         }
                    }
                    toArray(fragments).forEach(function (el, i) {
                         if (el.hasAttribute('data-fragment-index')) {
                              i = parseInt(el.getAttribute('data-fragment-index'), 10)
                         }
                         if (i <= index) {
                              if (!el.classList.contains('visible')) changedFragments.shown.push(el);
                              el.classList.add('visible');
                              el.classList.remove('current-fragment');
                              dom.statusDiv.textContent = getStatusText(el);
                              if (i === index) {
                                   el.classList.add('current-fragment');
                                   startEmbeddedContent(el)
                              }
                         } else {
                              if (el.classList.contains('visible')) changedFragments.hidden.push(el);
                              el.classList.remove('visible');
                              el.classList.remove('current-fragment')
                         }
                    })
               }
          }
          return changedFragments
     }

     function navigateFragment(index, offset) {
          if (currentSlide && config.fragments) {
               var fragments = sortFragments(currentSlide.querySelectorAll('.fragment'));
               if (fragments.length) {
                    if (typeof index !== 'number') {
                         var lastVisibleFragment = sortFragments(currentSlide.querySelectorAll('.fragment.visible')).pop();
                         if (lastVisibleFragment) {
                              index = parseInt(lastVisibleFragment.getAttribute('data-fragment-index') || 0, 10)
                         } else {
                              index = -1
                         }
                    }
                    if (typeof offset === 'number') {
                         index += offset
                    }
                    var changedFragments = updateFragments(index, fragments);
                    if (changedFragments.hidden.length) {
                         dispatchEvent('fragmenthidden', {
                              fragment: changedFragments.hidden[0],
                              fragments: changedFragments.hidden
                         })
                    }
                    if (changedFragments.shown.length) {
                         dispatchEvent('fragmentshown', {
                              fragment: changedFragments.shown[0],
                              fragments: changedFragments.shown
                         })
                    }
                    updateControls();
                    updateProgress();
                    if (config.fragmentInURL) {
                         writeURL()
                    }
                    return !!(changedFragments.shown.length || changedFragments.hidden.length)
               }
          }
          return !1
     }

     function nextFragment() {
          return navigateFragment(null, 1)
     }

     function previousFragment() {
          return navigateFragment(null, -1)
     }

     function cueAutoSlide() {
          cancelAutoSlide();
          if (currentSlide && config.autoSlide !== !1) {
               var fragment = currentSlide.querySelector('.current-fragment');
               if (!fragment) fragment = currentSlide.querySelector('.fragment');
               var fragmentAutoSlide = fragment ? fragment.getAttribute('data-autoslide') : null;
               var parentAutoSlide = currentSlide.parentNode ? currentSlide.parentNode.getAttribute('data-autoslide') : null;
               var slideAutoSlide = currentSlide.getAttribute('data-autoslide');
               if (fragmentAutoSlide) {
                    autoSlide = parseInt(fragmentAutoSlide, 10)
               } else if (slideAutoSlide) {
                    autoSlide = parseInt(slideAutoSlide, 10)
               } else if (parentAutoSlide) {
                    autoSlide = parseInt(parentAutoSlide, 10)
               } else {
                    autoSlide = config.autoSlide
               }
               if (currentSlide.querySelectorAll('.fragment').length === 0) {
                    toArray(currentSlide.querySelectorAll('video, audio')).forEach(function (el) {
                         if (el.hasAttribute('data-autoplay')) {
                              if (autoSlide && (el.duration * 1000 / el.playbackRate) > autoSlide) {
                                   autoSlide = (el.duration * 1000 / el.playbackRate) + 1000
                              }
                         }
                    })
               }
               if (autoSlide && !autoSlidePaused && !isPaused() && !isOverview() && (!Reveal.isLastSlide() || availableFragments().next || config.loop === !0)) {
                    autoSlideTimeout = setTimeout(function () {
                         typeof config.autoSlideMethod === 'function' ? config.autoSlideMethod() : navigateNext();
                         cueAutoSlide()
                    }, autoSlide);
                    autoSlideStartTime = Date.now()
               }
               if (autoSlidePlayer) {
                    autoSlidePlayer.setPlaying(autoSlideTimeout !== -1)
               }
          }
     }

     function cancelAutoSlide() {
          clearTimeout(autoSlideTimeout);
          autoSlideTimeout = -1
     }

     function pauseAutoSlide() {
          if (autoSlide && !autoSlidePaused) {
               autoSlidePaused = !0;
               dispatchEvent('autoslidepaused');
               clearTimeout(autoSlideTimeout);
               if (autoSlidePlayer) {
                    autoSlidePlayer.setPlaying(!1)
               }
          }
     }

     function resumeAutoSlide() {
          if (autoSlide && autoSlidePaused) {
               autoSlidePaused = !1;
               dispatchEvent('autoslideresumed');
               cueAutoSlide()
          }
     }

     function navigateLeft() {
          if (config.rtl) {
               if ((isOverview() || nextFragment() === !1) && availableRoutes().left) {
                    slide(indexh + 1, config.navigationMode === 'grid' ? indexv : undefined)
               }
          } else if ((isOverview() || previousFragment() === !1) && availableRoutes().left) {
               slide(indexh - 1, config.navigationMode === 'grid' ? indexv : undefined)
          }
     }

     function navigateRight() {
          hasNavigatedRight = !0;
          if (config.rtl) {
               if ((isOverview() || previousFragment() === !1) && availableRoutes().right) {
                    slide(indexh - 1, config.navigationMode === 'grid' ? indexv : undefined)
               }
          } else if ((isOverview() || nextFragment() === !1) && availableRoutes().right) {
               slide(indexh + 1, config.navigationMode === 'grid' ? indexv : undefined)
          }
     }

     function navigateUp() {
          if ((isOverview() || previousFragment() === !1) && availableRoutes().up) {
               slide(indexh, indexv - 1)
          }
     }

     function navigateDown() {
          hasNavigatedDown = !0;
          if ((isOverview() || nextFragment() === !1) && availableRoutes().down) {
               slide(indexh, indexv + 1)
          }
     }

     function navigatePrev() {
          if (previousFragment() === !1) {
               if (availableRoutes().up) {
                    navigateUp()
               } else {
                    var previousSlide;
                    if (config.rtl) {
                         previousSlide = toArray(dom.wrapper.querySelectorAll(HORIZONTAL_SLIDES_SELECTOR + '.future')).pop()
                    } else {
                         previousSlide = toArray(dom.wrapper.querySelectorAll(HORIZONTAL_SLIDES_SELECTOR + '.past')).pop()
                    }
                    if (previousSlide) {
                         var v = (previousSlide.querySelectorAll('section').length - 1) || undefined;
                         var h = indexh - 1;
                         slide(h, v)
                    }
               }
          }
     }

     function navigateNext() {
          hasNavigatedRight = !0;
          hasNavigatedDown = !0;
          if (nextFragment() === !1) {
               var routes = availableRoutes();
               if (routes.down && routes.right && config.loop && Reveal.isLastVerticalSlide(currentSlide)) {
                    routes.down = !1
               }
               if (routes.down) {
                    navigateDown()
               } else if (config.rtl) {
                    navigateLeft()
               } else {
                    navigateRight()
               }
          }
     }

     function isSwipePrevented(target) {
          while (target && typeof target.hasAttribute === 'function') {
               if (target.hasAttribute('data-prevent-swipe')) return !0;
               target = target.parentNode
          }
          return !1
     }

     function onUserInput(event) {
          if (config.autoSlideStoppable) {
               pauseAutoSlide()
          }
     }

     function onDocumentCursorActive(event) {
          showCursor();
          clearTimeout(cursorInactiveTimeout);
          cursorInactiveTimeout = setTimeout(hideCursor, config.hideCursorTime)
     }

     function onDocumentKeyPress(event) {
          if (event.shiftKey && event.charCode === 63) {
               toggleHelp()
          }
     }

     function onDocumentKeyDown(event) {
          if (typeof config.keyboardCondition === 'function' && config.keyboardCondition(event) === !1) {
               return !0
          }
          var keyCode = event.keyCode;
          var autoSlideWasPaused = autoSlidePaused;
          onUserInput(event);
          var activeElementIsCE = document.activeElement && document.activeElement.contentEditable !== 'inherit';
          var activeElementIsInput = document.activeElement && document.activeElement.tagName && /input|textarea/i.test(document.activeElement.tagName);
          var activeElementIsNotes = document.activeElement && document.activeElement.className && /speaker-notes/i.test(document.activeElement.className);
          var prevSlideShortcut = event.shiftKey && event.keyCode === 32;
          var firstSlideShortcut = (event.metaKey || event.ctrlKey) && keyCode === 37;
          var lastSlideShortcut = (event.metaKey || event.ctrlKey) && keyCode === 39;
          var unusedModifier = !prevSlideShortcut && !firstSlideShortcut && !lastSlideShortcut && (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey);
          if (activeElementIsCE || activeElementIsInput || activeElementIsNotes || unusedModifier) return;
          var resumeKeyCodes = [66, 86, 190, 191];
          var key;
          if (typeof config.keyboard === 'object') {
               for (key in config.keyboard) {
                    if (config.keyboard[key] === 'togglePause') {
                         resumeKeyCodes.push(parseInt(key, 10))
                    }
               }
          }
          if (isPaused() && resumeKeyCodes.indexOf(keyCode) === -1) {
               return !1
          }
          var triggered = !1;
          if (typeof config.keyboard === 'object') {
               for (key in config.keyboard) {
                    if (parseInt(key, 10) === keyCode) {
                         var value = config.keyboard[key];
                         if (typeof value === 'function') {
                              value.apply(null, [event])
                         } else if (typeof value === 'string' && typeof Reveal[value] === 'function') {
                              Reveal[value].call()
                         }
                         triggered = !0
                    }
               }
          }
          if (triggered === !1) {
               for (key in registeredKeyBindings) {
                    if (parseInt(key, 10) === keyCode) {
                         var action = registeredKeyBindings[key].callback;
                         if (typeof action === 'function') {
                              action.apply(null, [event])
                         } else if (typeof action === 'string' && typeof Reveal[action] === 'function') {
                              Reveal[action].call()
                         }
                         triggered = !0
                    }
               }
          }
          if (triggered === !1) {
               triggered = !0;
               if (keyCode === 80 || keyCode === 33) {
                    navigatePrev()
               } else if (keyCode === 78 || keyCode === 34) {
                    navigateNext()
               } else if (keyCode === 72 || keyCode === 37) {
                    if (firstSlideShortcut) {
                         slide(0)
                    } else if (!isOverview() && config.navigationMode === 'linear') {
                         navigatePrev()
                    } else {
                         navigateLeft()
                    }
               } else if (keyCode === 76 || keyCode === 39) {
                    if (lastSlideShortcut) {
                         slide(Number.MAX_VALUE)
                    } else if (!isOverview() && config.navigationMode === 'linear') {
                         navigateNext()
                    } else {
                         navigateRight()
                    }
               } else if (keyCode === 75 || keyCode === 38) {
                    if (!isOverview() && config.navigationMode === 'linear') {
                         navigatePrev()
                    } else {
                         navigateUp()
                    }
               } else if (keyCode === 74 || keyCode === 40) {
                    if (!isOverview() && config.navigationMode === 'linear') {
                         navigateNext()
                    } else {
                         navigateDown()
                    }
               } else if (keyCode === 36) {
                    slide(0)
               } else if (keyCode === 35) {
                    slide(Number.MAX_VALUE)
               } else if (keyCode === 32) {
                    if (isOverview()) {
                         deactivateOverview()
                    }
                    if (event.shiftKey) {
                         navigatePrev()
                    } else {
                         navigateNext()
                    }
               } else if (keyCode === 58 || keyCode === 59 || keyCode === 66 || keyCode === 86 || keyCode === 190 || keyCode === 191) {
                    togglePause()
               } else if (keyCode === 70) {
                    enterFullscreen()
               } else if (keyCode === 65) {
                    if (config.autoSlideStoppable) {
                         toggleAutoSlide(autoSlideWasPaused)
                    }
               } else {
                    triggered = !1
               }
          }
          if (triggered) {
               event.preventDefault && event.preventDefault()
          } else if ((keyCode === 27 || keyCode === 79) && features.transforms3d) {
               if (dom.overlay) {
                    closeOverlay()
               } else {
                    toggleOverview()
               }
               event.preventDefault && event.preventDefault()
          }
          cueAutoSlide()
     }

     function onTouchStart(event) {
          if (isSwipePrevented(event.target)) return !0;
          touch.startX = event.touches[0].clientX;
          touch.startY = event.touches[0].clientY;
          touch.startCount = event.touches.length
     }

     function onTouchMove(event) {
          if (isSwipePrevented(event.target)) return !0;
          if (!touch.captured) {
               onUserInput(event);
               var currentX = event.touches[0].clientX;
               var currentY = event.touches[0].clientY;
               if (event.touches.length === 1 && touch.startCount !== 2) {
                    var deltaX = currentX - touch.startX,
                         deltaY = currentY - touch.startY;
                    if (deltaX > touch.threshold && Math.abs(deltaX) > Math.abs(deltaY)) {
                         touch.captured = !0;
                         navigateLeft()
                    } else if (deltaX < -touch.threshold && Math.abs(deltaX) > Math.abs(deltaY)) {
                         touch.captured = !0;
                         navigateRight()
                    } else if (deltaY > touch.threshold) {
                         touch.captured = !0;
                         navigateUp()
                    } else if (deltaY < -touch.threshold) {
                         touch.captured = !0;
                         navigateDown()
                    }
                    if (config.embedded) {
                         if (touch.captured || isVerticalSlide(currentSlide)) {
                              event.preventDefault()
                         }
                    } else {
                         event.preventDefault()
                    }
               }
          } else if (UA.match(/android/gi)) {
               event.preventDefault()
          }
     }

     function onTouchEnd(event) {
          touch.captured = !1
     }

     function onPointerDown(event) {
          if (event.pointerType === event.MSPOINTER_TYPE_TOUCH || event.pointerType === "touch") {
               event.touches = [{
                    clientX: event.clientX,
                    clientY: event.clientY
               }];
               onTouchStart(event)
          }
     }

     function onPointerMove(event) {
          if (event.pointerType === event.MSPOINTER_TYPE_TOUCH || event.pointerType === "touch") {
               event.touches = [{
                    clientX: event.clientX,
                    clientY: event.clientY
               }];
               onTouchMove(event)
          }
     }

     function onPointerUp(event) {
          if (event.pointerType === event.MSPOINTER_TYPE_TOUCH || event.pointerType === "touch") {
               event.touches = [{
                    clientX: event.clientX,
                    clientY: event.clientY
               }];
               onTouchEnd(event)
          }
     }

     function onDocumentMouseScroll(event) {
          if (Date.now() - lastMouseWheelStep > 600) {
               lastMouseWheelStep = Date.now();
               var delta = event.detail || -event.wheelDelta;
               if (delta > 0) {
                    navigateNext()
               } else if (delta < 0) {
                    navigatePrev()
               }
          }
     }

     function onProgressClicked(event) {
          onUserInput(event);
          event.preventDefault();
          var slidesTotal = toArray(dom.wrapper.querySelectorAll(HORIZONTAL_SLIDES_SELECTOR)).length;
          var slideIndex = Math.floor((event.clientX / dom.wrapper.offsetWidth) * slidesTotal);
          if (config.rtl) {
               slideIndex = slidesTotal - slideIndex
          }
          slide(slideIndex)
     }

     function onNavigateLeftClicked(event) {
          event.preventDefault();
          onUserInput();
          config.navigationMode === 'linear' ? navigatePrev() : navigateLeft()
     }

     function onNavigateRightClicked(event) {
          event.preventDefault();
          onUserInput();
          config.navigationMode === 'linear' ? navigateNext() : navigateRight()
     }

     function onNavigateUpClicked(event) {
          event.preventDefault();
          onUserInput();
          navigateUp()
     }

     function onNavigateDownClicked(event) {
          event.preventDefault();
          onUserInput();
          navigateDown()
     }

     function onNavigatePrevClicked(event) {
          event.preventDefault();
          onUserInput();
          navigatePrev()
     }

     function onNavigateNextClicked(event) {
          event.preventDefault();
          onUserInput();
          navigateNext()
     }

     function onWindowHashChange(event) {
          readURL()
     }

     function onWindowResize(event) {
          layout()
     }

     function onPageVisibilityChange(event) {
          var isHidden = document.webkitHidden || document.msHidden || document.hidden;
          if (isHidden === !1 && document.activeElement !== document.body) {
               if (typeof document.activeElement.blur === 'function') {
                    document.activeElement.blur()
               }
               document.body.focus()
          }
     }

     function onOverviewSlideClicked(event) {
          if (eventsAreBound && isOverview()) {
               event.preventDefault();
               var element = event.target;
               while (element && !element.nodeName.match(/section/gi)) {
                    element = element.parentNode
               }
               if (element && !element.classList.contains('disabled')) {
                    deactivateOverview();
                    if (element.nodeName.match(/section/gi)) {
                         var h = parseInt(element.getAttribute('data-index-h'), 10),
                              v = parseInt(element.getAttribute('data-index-v'), 10);
                         slide(h, v)
                    }
               }
          }
     }

     function onPreviewLinkClicked(event) {
          if (event.currentTarget && event.currentTarget.hasAttribute('href')) {
               var url = event.currentTarget.getAttribute('href');
               if (url) {
                    showPreview(url);
                    event.preventDefault()
               }
          }
     }

     function onAutoSlidePlayerClick(event) {
          if (Reveal.isLastSlide() && config.loop === !1) {
               slide(0, 0);
               resumeAutoSlide()
          } else if (autoSlidePaused) {
               resumeAutoSlide()
          } else {
               pauseAutoSlide()
          }
     }

     function Playback(container, progressCheck) {
          this.diameter = 100;
          this.diameter2 = this.diameter / 2;
          this.thickness = 6;
          this.playing = !1;
          this.progress = 0;
          this.progressOffset = 1;
          this.container = container;
          this.progressCheck = progressCheck;
          this.canvas = document.createElement('canvas');
          this.canvas.className = 'playback';
          this.canvas.width = this.diameter;
          this.canvas.height = this.diameter;
          this.canvas.style.width = this.diameter2 + 'px';
          this.canvas.style.height = this.diameter2 + 'px';
          this.context = this.canvas.getContext('2d');
          this.container.appendChild(this.canvas);
          this.render()
     }
     Playback.prototype.setPlaying = function (value) {
          var wasPlaying = this.playing;
          this.playing = value;
          if (!wasPlaying && this.playing) {
               this.animate()
          } else {
               this.render()
          }
     };
     Playback.prototype.animate = function () {
          var progressBefore = this.progress;
          this.progress = this.progressCheck();
          if (progressBefore > 0.8 && this.progress < 0.2) {
               this.progressOffset = this.progress
          }
          this.render();
          if (this.playing) {
               features.requestAnimationFrameMethod.call(window, this.animate.bind(this))
          }
     };
     Playback.prototype.render = function () {
          var progress = this.playing ? this.progress : 0,
               radius = (this.diameter2) - this.thickness,
               x = this.diameter2,
               y = this.diameter2,
               iconSize = 28;
          this.progressOffset += (1 - this.progressOffset) * 0.1;
          var endAngle = (-Math.PI / 2) + (progress * (Math.PI * 2));
          var startAngle = (-Math.PI / 2) + (this.progressOffset * (Math.PI * 2));
          this.context.save();
          this.context.clearRect(0, 0, this.diameter, this.diameter);
          this.context.beginPath();
          this.context.arc(x, y, radius + 4, 0, Math.PI * 2, !1);
          this.context.fillStyle = 'rgba( 0, 0, 0, 0.4 )';
          this.context.fill();
          this.context.beginPath();
          this.context.arc(x, y, radius, 0, Math.PI * 2, !1);
          this.context.lineWidth = this.thickness;
          this.context.strokeStyle = 'rgba( 255, 255, 255, 0.2 )';
          this.context.stroke();
          if (this.playing) {
               this.context.beginPath();
               this.context.arc(x, y, radius, startAngle, endAngle, !1);
               this.context.lineWidth = this.thickness;
               this.context.strokeStyle = '#fff';
               this.context.stroke()
          }
          this.context.translate(x - (iconSize / 2), y - (iconSize / 2));
          if (this.playing) {
               this.context.fillStyle = '#fff';
               this.context.fillRect(0, 0, iconSize / 2 - 4, iconSize);
               this.context.fillRect(iconSize / 2 + 4, 0, iconSize / 2 - 4, iconSize)
          } else {
               this.context.beginPath();
               this.context.translate(4, 0);
               this.context.moveTo(0, 0);
               this.context.lineTo(iconSize - 4, iconSize / 2);
               this.context.lineTo(0, iconSize);
               this.context.fillStyle = '#fff';
               this.context.fill()
          }
          this.context.restore()
     };
     Playback.prototype.on = function (type, listener) {
          this.canvas.addEventListener(type, listener, !1)
     };
     Playback.prototype.off = function (type, listener) {
          this.canvas.removeEventListener(type, listener, !1)
     };
     Playback.prototype.destroy = function () {
          this.playing = !1;
          if (this.canvas.parentNode) {
               this.container.removeChild(this.canvas)
          }
     };
     Reveal = {
          VERSION: VERSION,
          initialize: initialize,
          configure: configure,
          sync: sync,
          syncSlide: syncSlide,
          syncFragments: syncFragments,
          slide: slide,
          left: navigateLeft,
          right: navigateRight,
          up: navigateUp,
          down: navigateDown,
          prev: navigatePrev,
          next: navigateNext,
          navigateFragment: navigateFragment,
          prevFragment: previousFragment,
          nextFragment: nextFragment,
          navigateTo: slide,
          navigateLeft: navigateLeft,
          navigateRight: navigateRight,
          navigateUp: navigateUp,
          navigateDown: navigateDown,
          navigatePrev: navigatePrev,
          navigateNext: navigateNext,
          layout: layout,
          shuffle: shuffle,
          availableRoutes: availableRoutes,
          availableFragments: availableFragments,
          toggleHelp: toggleHelp,
          toggleOverview: toggleOverview,
          togglePause: togglePause,
          toggleAutoSlide: toggleAutoSlide,
          isOverview: isOverview,
          isPaused: isPaused,
          isAutoSliding: isAutoSliding,
          isSpeakerNotes: isSpeakerNotes,
          loadSlide: loadSlide,
          unloadSlide: unloadSlide,
          addEventListeners: addEventListeners,
          removeEventListeners: removeEventListeners,
          getState: getState,
          setState: setState,
          getSlidePastCount: getSlidePastCount,
          getProgress: getProgress,
          getIndices: getIndices,
          getSlides: getSlides,
          getSlidesAttributes: getSlidesAttributes,
          getTotalSlides: getTotalSlides,
          getSlide: getSlide,
          getSlideBackground: getSlideBackground,
          getSlideNotes: getSlideNotes,
          getPreviousSlide: function () {
               return previousSlide
          },
          getCurrentSlide: function () {
               return currentSlide
          },
          getScale: function () {
               return scale
          },
          getConfig: function () {
               return config
          },
          getQueryHash: function () {
               var query = {};
               location.search.replace(/[A-Z0-9]+?=([\w\.%-]*)/gi, function (a) {
                    query[a.split('=').shift()] = a.split('=').pop()
               });
               for (var i in query) {
                    var value = query[i];
                    query[i] = deserialize(unescape(value))
               }
               return query
          },
          getRevealElement: function () {
               return dom.wrapper || document.querySelector('.reveal')
          },
          getPlugins: function () {
               return plugins
          },
          isFirstSlide: function () {
               return (indexh === 0 && indexv === 0)
          },
          isLastSlide: function () {
               if (currentSlide) {
                    if (currentSlide.nextElementSibling) return !1;
                    if (isVerticalSlide(currentSlide) && currentSlide.parentNode.nextElementSibling) return !1;
                    return !0
               }
               return !1
          },
          isLastVerticalSlide: function () {
               if (currentSlide && isVerticalSlide(currentSlide)) {
                    if (currentSlide.nextElementSibling) return !1;
                    return !0
               }
               return !1
          },
          isReady: function () {
               return loaded
          },
          addEventListener: function (type, listener, useCapture) {
               if ('addEventListener' in window) {
                    Reveal.getRevealElement().addEventListener(type, listener, useCapture)
               }
          },
          removeEventListener: function (type, listener, useCapture) {
               if ('addEventListener' in window) {
                    Reveal.getRevealElement().removeEventListener(type, listener, useCapture)
               }
          },
          addKeyBinding: addKeyBinding,
          removeKeyBinding: removeKeyBinding,
          registerPlugin: registerPlugin,
          hasPlugin: hasPlugin,
          getPlugin: getPlugin,
          triggerKey: function (keyCode) {
               onDocumentKeyDown({
                    keyCode: keyCode
               })
          },
          registerKeyboardShortcut: function (key, value) {
               keyboardShortcuts[key] = value
          }
     };
     return Reveal
}))