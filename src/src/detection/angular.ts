/**
 * Angular Detection Engine
 *
 * Extiende TypeScript con detección de:
 * - Módulos de Angular (@NgModule, @Component, @Injectable, @Pipe, @Directive)
 * - Decorators de Angular (@Input, @Output, @ViewChild, etc.)
 * - Lifecycle hooks (ngOnInit, ngOnDestroy, etc.)
 * - APIs comunes de Angular y RxJS
 * - Typos comunes en código Angular
 */

import type { Issue, ImportInfo } from "./index.js";

// Angular modules commonly imported
const ANGULAR_MODULES = new Set([
  "NgModule", "Component", "Injectable", "Pipe", "Directive",
  "Input", "Output", "ViewChild", "ViewChildren", "ContentChild", "ContentChildren",
  "HostBinding", "HostListener", "ElementRef", "Renderer2",
  "OnInit", "OnDestroy", "OnChanges", "AfterViewInit", "AfterContentInit",
  "AfterViewChecked", "AfterContentChecked", "DoCheck", "ngOnInit", "ngOnDestroy",
  "NgZone", "ChangeDetectorRef", "ChangeDetectionStrategy",
  "CommonModule", "BrowserModule", "FormsModule", "ReactiveFormsModule",
  "RouterModule", "HttpClientModule", "HttpModule",
  "BrowserAnimationsModule", "NoopAnimationsModule",
]);

// Angular APIs por categoría
const ANGULAR_STDLIB: Record<string, Set<string>> = {
  // Módulos de Angular
  "@NgModule": new Set([
    "declarations", "imports", "exports", "providers", "bootstrap",
    "entryComponents", "schemas", "id", "jit", "preserveWhitespaces",
  ]),
  "@Component": new Set([
    "selector", "template", "templateUrl", "styles", "styleUrls",
    "animations", "encapsulation", "changeDetection", "exportAs",
    "inputs", "outputs", "host", "jit", "preserveWhitespaces",
    "moduleId", "viewProviders",
  ]),
  "@Injectable": new Set([
    "providedIn", "root", "platform", "any", "module",
  ]),
  "@Pipe": new Set([
    "name", "pure", "standalone",
  ]),
  "@Directive": new Set([
    "selector", "inputs", "outputs", "host", "exportAs",
    "jit", "preserveWhitespaces", "queries",
  ]),
  "@Input": new Set([
    "bindingPropertyName", "required", "alias",
  ]),
  "@Output": new Set([
    "bindingPropertyName", "required", "alias",
  ]),
  "@ViewChild": new Set([
    "static", "read", "write",
  ]),
  "@ViewChildren": new Set([
    "read", "write", "emit", "emitDistinctChangesOnly",
  ]),
  "@HostBinding": new Set([
    "hostPropertyName",
  ]),
  "@HostListener": new Set([
    "eventName", "args",
  ]),

  // Directivas estructurales y common
  "NgFor": new Set([
    "ngFor", "ngForOf", "ngForTemplate", "trackBy",
  ]),
  "NgIf": new Set([
    "ngIf", "ngIfThen", "ngIfElse",
  ]),
  "NgSwitch": new Set([
    "ngSwitch", "ngSwitchCase", "ngSwitchDefault",
  ]),
  "NgClass": new Set([
    "ngClass",
  ]),
  "NgStyle": new Set([
    "ngStyle",
  ]),
  "NgTemplateOutlet": new Set([
    "ngTemplateOutlet", "ngTemplateOutletContext",
  ]),
  "NgComponentOutlet": new Set([
    "ngComponentOutlet",
  ]),

  // Pipes incorporados
  "AsyncPipe": new Set([
    "transform", "ngOnDestroy",
  ]),
  "DecimalPipe": new Set([
    "transform",
  ]),
  "CurrencyPipe": new Set([
    "transform",
  ]),
  "DatePipe": new Set([
    "transform",
  ]),
  "JsonPipe": new Set([
    "transform",
  ]),
  "SlicePipe": new Set([
    "transform",
  ]),
  "LowerCasePipe": new Set([
    "transform",
  ]),
  "UpperCasePipe": new Set([
    "transform",
  ]),
  "TitleCasePipe": new Set([
    "transform",
  ]),
  "PercentPipe": new Set([
    "transform",
  ]),

  // Formularios
  "FormControl": new Set([
    "value", "status", "pristine", "dirty", "valid", "invalid",
    "errors", "setValue", "patchValue", "reset", "markAsTouched",
    "markAsUntouched", "markAsDirty", "markAsPristine", "enable", "disable",
    "setErrors", "get", "hasError", "valueChanges", "statusChanges",
  ]),
  "FormGroup": new Set([
    "value", "status", "pristine", "dirty", "valid", "invalid",
    "controls", "setValue", "patchValue", "reset", "addControl",
    "removeControl", "get", "hasError", "setErrors", "valueChanges",
    "statusChanges",
  ]),
  "FormArray": new Set([
    "controls", "length", "at", "push", "insert", "removeAt",
    "clear", "setValue", "patchValue", "reset", "get", "hasError",
  ]),
  "FormBuilder": new Set([
    "group", "control", "array",
  ]),
  "Validators": new Set([
    "required", "minLength", "maxLength", "pattern", "email",
    "min", "max", "requiredTrue", "nullValidator", "compose",
    "composeAsync",
  ]),

  // RxJS
  "Observable": new Set([
    "subscribe", "pipe", "map", "filter", "tap", "catchError",
    "take", "takeUntil", "takeWhile", "skip", "distinctUntilChanged",
    "debounceTime", "throttleTime", "switchMap", "mergeMap", "concatMap",
    "exhaustMap", "combineLatest", "forkJoin", "zip", "from", "of",
    "interval", "timer", "fromEvent", "fromEventPattern", "throwError",
    "BehaviorSubject", "Subject", "ReplaySubject", "AsyncSubject",
  ]),
  "BehaviorSubject": new Set([
    "value", "getValue", "next", "subscribe", "pipe",
  ]),
  "Subject": new Set([
    "next", "subscribe", "pipe", "asObservable", "unsubscribe",
  ]),
  "Subscription": new Set([
    "unsubscribe", "add", "remove", "closed",
  ]),
  "Operators": new Set([
    "pipe", "map", "filter", "tap", "catchError", "take", "takeUntil",
    "takeWhile", "skip", "distinctUntilChanged", "debounceTime",
    "throttleTime", "switchMap", "mergeMap", "concatMap", "exhaustMap",
    "pluck", "retry", "retryWhen", "scan", "buffer", "bufferTime",
    "combineLatestAll", "concatAll", "mergeAll", "reduce", "startWith",
    "withLatestFrom", "share", "shareReplay", "refCount",
  ]),

  // Router
  "RouterModule": new Set([
    "forRoot", "forChild", "Routes", "RouterModule",
  ]),
  "Router": new Set([
    "navigate", "navigateByUrl", "parseUrl", "createUrlTree",
    "isActive", "url", "navigateByUrl", "events", "routeReuseStrategy",
  ]),
  "ActivatedRoute": new Set([
    "params", "queryParams", "fragment", "data", "url",
    "paramMap", "queryParamMap", "snapshot", "parent", "children",
    "firstChild", "root",
  ]),
  "Routes": new Set([
    "path", "component", "redirectTo", "pathMatch", "children",
    "loadChildren", "canActivate", "canDeactivate", "canLoad",
    "data", "resolve",
  ]),

  // HttpClient
  "HttpClient": new Set([
    "get", "post", "put", "patch", "delete", "head", "request",
    "json", "response",
  ]),
  "HttpResponse": new Set([
    "body", "status", "statusText", "headers", "ok",
  ]),
  "HttpErrorResponse": new Set([
    "message", "name", "status", "statusText", "error", "url",
  ]),

  // Misc Angular
  "NgZone": new Set([
    "run", "runOutsideAngular", "runInAngular", "onStable", "onUnstable",
    "onMicrotaskEmpty", "onError",
  ]),
  "ChangeDetectorRef": new Set([
    "detectChanges", "markForCheck", "detach", "reattach", "checkNoChanges",
  ]),
  "ComponentFactoryResolver": new Set([
    "resolveComponentFactory", "clear", "resolveComponentFactoryByKey",
  ]),
  "TemplateRef": new Set([
    "element", "createEmbeddedView",
  ]),
  "ViewContainerRef": new Set([
    "clear", "createEmbeddedView", "createComponent", "insert",
    "move", "remove", "detach",
  ]),
  "ElementRef": new Set([
    "nativeElement",
  ]),
};

// Angular lifecycle hooks
const LIFECYCLE_HOOKS = new Set([
  "ngOnInit",
  "ngOnDestroy",
  "ngOnChanges",
  "ngDoCheck",
  "ngAfterViewInit",
  "ngAfterViewChecked",
  "ngAfterContentInit",
  "ngAfterContentChecked",
  "ngOnDestroy",
]);

// Common Angular typos
const ANGULAR_TYPOS: Record<string, Record<string, string>> = {
  // Decorators
  "@Component": {
    "@Compoent": "@Component",
    "@compoent": "@Component",
    "@Compnent": "@Component",
    "@component": "@Component",
  },
  "@NgModule": {
    "@NgMdoule": "@NgModule",
    "@ngmodule": "@NgModule",
    "@NgMoudle": "@NgModule",
  },
  "@Injectable": {
    "@Injecteable": "@Injectable",
    "@injectable": "@Injectable",
    "@Inectable": "@Injectable",
  },
  "@Pipe": {
    "@Pie": "@Pipe",
    "@pipe": "@Pipe",
  },
  "@Directive": {
    "@Directiv": "@Directive",
    "@directive": "@Directive",
  },
  "@Input": {
    "@Inpt": "@Input",
    "@inpt": "@Input",
    "@Inputt": "@Input",
  },
  "@Output": {
    "@Outpt": "@Output",
    "@outpt": "@Output",
    "@Outputt": "@Output",
  },
  "@ViewChild": {
    "@ViewChld": "@ViewChild",
    "@viewchild": "@ViewChild",
    "@Viewchild": "@ViewChild",
  },
  "@ViewChildren": {
    "@ViewChildrens": "@ViewChildren",
    "@viewchildren": "@ViewChildren",
  },
  "@HostBinding": {
    "@HostBindng": "@HostBinding",
    "@hostbinding": "@HostBinding",
  },
  "@HostListener": {
    "@HostListner": "@HostListener",
    "@hostlistener": "@HostListener",
  },

  // Properties
  selector: {
    seletor: "selector",
    slector: "selector",
    selectro: "selector",
    selecter: "selector",
  },
  template: {
    temmplate: "template",
    templtae: "template",
    templte: "template",
    templat: "template",
  },
  templateUrl: {
    templateUrll: "templateUrl",
    templatUrl: "templateUrl",
  },
  styles: {
    styless: "styles",
    style: "styles",
  },
  styleUrls: {
    styleUrl: "styleUrls",
    styleUrll: "styleUrls",
  },
  providers: {
    proivders: "providers",
    provider: "providers",
    proiders: "providers",
  },
  imports: {
    imort: "imports",
    impot: "imports",
    imporrt: "imports",
  },
  exports: {
    exportt: "exports",
    exprots: "exports",
  },
  declarations: {
    declaratons: "declarations",
    declaration: "declarations",
    declaratoins: "declarations",
  },
  bootstrap: {
    boostrap: "bootstrap",
    bootsrap: "bootstrap",
  },

  // Lifecycle hooks
  ngOnInit: {
    ngOnint: "ngOnInit",
    ngoninit: "ngOnInit",
    nginIt: "ngOnInit",
    ngOninti: "ngOnInit",
    ngOnInIt: "ngOnInit",
  },
  ngOnDestroy: {
    ngOnDestoy: "ngOnDestroy",
    ngondestroy: "ngOnDestroy",
    ngOndestro: "ngOnDestroy",
    ngOnDestroyy: "ngOnDestroy",
  },
  ngOnChanges: {
    ngOnChages: "ngOnChanges",
    ngonchanges: "ngOnChanges",
    ngOnChangess: "ngOnChanges",
  },
  ngAfterViewInit: {
    ngAfterViewnit: "ngAfterViewInit",
    ngafterviewinit: "ngAfterViewInit",
    ngAfterViewinnit: "ngAfterViewInit",
  },
  ngAfterContentInit: {
    ngAfterContentnit: "ngAfterContentInit",
    ngaftercontentinit: "ngAfterContentInit",
  },
  ngDoCheck: {
    ngdoCheck: "ngDoCheck",
    ngDochek: "ngDoCheck",
  },

  // Common APIs
  BehaviorSubject: {
    Behaviorbus: "BehaviorSubject",
    BehavorSubject: "BehaviorSubject",
    BehavoiurSubject: "BehaviorSubject",
  },
  Observable: {
    Obseravble: "Observable",
    obserable: "Observable",
    Observabl: "Observable",
    observabl: "Observable",
  },
  Subject: {
    Subjet: "Subject",
    subect: "Subject",
  },
  subscribe: {
    subscibe: "subscribe",
    subsribe: "subscribe",
    subcribe: "subscribe",
  },
  pipe: {
    pipel: "pipe",
    pip: "pipe",
  },
  map: {
    mapp: "map",
    maap: "map",
  },
  filter: {
    filte: "filter",
    fiter: "filter",
    fillter: "filter",
  },
  take: {
    taek: "take",
    tak: "take",
  },
  FormControl: {
    FormContorl: "FormControl",
    formControl: "FormControl",
  },
  FormGroup: {
    FormGrop: "FormGroup",
    formGroup: "FormGroup",
  },
  FormArray: {
    FormArary: "FormArray",
    formArray: "FormArray",
  },
  CommonModule: {
    Commonmdoule: "CommonModule",
    commonModule: "CommonModule",
  },
  RouterModule: {
    RouterMdule: "RouterModule",
    routerModule: "RouterModule",
  },
  HttpClient: {
    HttpClint: "HttpClient",
    httpClient: "HttpClient",
  },
  ChangeDetectorRef: {
    ChangeDetector: "ChangeDetectorRef",
    changeDetectorRef: "ChangeDetectorRef",
  },
  NgZone: {
    ngZone: "NgZone",
    Ngzone: "NgZone",
  },
  AsyncPipe: {
    Async: "AsyncPipe",
    asyncPipe: "AsyncPipe",
  },
};

/**
 * Distancia de Levenshtein para detectar typos
 */
function levenshteinDistance(s1: string, s2: string): number {
  if (s1.length < s2.length) [s1, s2] = [s2, s1];
  const len2 = s2.length;
  let prevRow = Array.from({ length: len2 + 1 }, (_, i) => i);

  for (let i = 0; i < s1.length; i++) {
    const currentRow = [i + 1];
    for (let j = 0; j < len2; j++) {
      const insertions = prevRow[j + 1] + 1;
      const deletions = currentRow[j] + 1;
      const substitutions = prevRow[j] + (s1[i] !== s2[j] ? 1 : 0);
      currentRow.push(Math.min(insertions, deletions, substitutions));
    }
    prevRow = currentRow;
  }
  return prevRow[len2];
}

/**
 * Parse Angular imports del código
 */
export function parseAngularImports(code: string): ImportInfo[] {
  const imports: ImportInfo[] = [];
  const lines = code.split("\n");

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // import { ... } from '...'
    const namedImportMatch = trimmed.match(/^import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/);
    if (namedImportMatch) {
      const specifiers = namedImportMatch[1];
      const modulePath = namedImportMatch[2];

      // Parse individual imports from { a, b, c }
      const specifierMatches = specifiers.matchAll(/(\w+)(?:\s+as\s+\w+)?/g);
      for (const match of specifierMatches) {
        const name = match[1];
        const aliasMatch = specifiers.match(new RegExp(`${name}\\s+as\\s+(\\w+)`));
        imports.push({
          name,
          alias: aliasMatch ? aliasMatch[1] : null,
          from_module: modulePath,
          is_from: true,
          line: idx + 1,
        });
      }
      return;
    }

    // import * as X from '...'
    const namespaceImportMatch = trimmed.match(/^import\s+\*\s+as\s+(\w+)\s+from\s+['"]([^'"]+)['"]/);
    if (namespaceImportMatch) {
      imports.push({
        name: namespaceImportMatch[1],
        alias: null,
        from_module: namespaceImportMatch[2],
        is_from: false,
        line: idx + 1,
      });
      return;
    }

    // import X from '...' (default import)
    const defaultImportMatch = trimmed.match(/^import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/);
    if (defaultImportMatch) {
      imports.push({
        name: defaultImportMatch[1],
        alias: null,
        from_module: defaultImportMatch[2],
        is_from: true,
        line: idx + 1,
      });
    }
  });

  return imports;
}

/**
 * Detectar typos en Angular
 */
function detectAngularTypos(code: string): Issue[] {
  const issues: Issue[] = [];
  const lines = code.split("\n");

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Skip comments
    if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*")) {
      return;
    }

    // Check against known typos
    for (const [correct, typos] of Object.entries(ANGULAR_TYPOS)) {
      for (const [typo, fix] of Object.entries(typos)) {
        if (trimmed.includes(typo)) {
          // Only report if it's likely a decorator or property name
          if (typo.startsWith("@") || correct === trimmed.split(":")[0]?.trim()) {
            issues.push({
              line: idx + 1,
              code_snippet: trimmed,
              error_type: "typo",
              message: `Posible typo: '${typo}' debería ser '${fix}'`,
              suggestion: fix,
            });
          }
        }
      }
    }
  });

  return issues;
}

/**
 * Detectar decoradores Angular mal formados
 */
function detectAngularDecoratorIssues(code: string): Issue[] {
  const issues: Issue[] = [];
  const lines = code.split("\n");
  const decoratorRegex = /^@(\w+)(?:<[^>]+>)?(?:\s*\()/g;

  const knownDecorators = new Set([
    "NgModule", "Component", "Injectable", "Pipe", "Directive",
    "Input", "Output", "ViewChild", "ViewChildren", "ContentChild", "ContentChildren",
    "HostBinding", "HostListener", "Attribute", "ContentChildren",
    "Component", "Directive", "Injectable", "Pipe", "Module",
  ]);

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Skip comments
    if (trimmed.startsWith("//") || trimmed.startsWith("/*")) {
      return;
    }

    let match;
    while ((match = decoratorRegex.exec(trimmed)) !== null) {
      const decoratorName = match[1];

      if (!knownDecorators.has(decoratorName)) {
        // Check if it's a typo of a known decorator
        let closestMatch: string | null = null;
        let minDistance = Infinity;

        for (const known of knownDecorators) {
          const dist = levenshteinDistance(decoratorName, known);
          if (dist < minDistance && dist <= 3) {
            minDistance = dist;
            closestMatch = known;
          }
        }

        if (closestMatch) {
          issues.push({
            line: idx + 1,
            code_snippet: trimmed,
            error_type: "typo",
            message: `Decorator '@${decoratorName}' desconocido. ¿Quisiste decir '@${closestMatch}'?`,
            suggestion: `@${closestMatch}`,
          });
        } else {
          issues.push({
            line: idx + 1,
            code_snippet: trimmed,
            error_type: "unknown_decorator",
            message: `Decorator '@${decoratorName}' no es un decorator Angular conocido`,
            suggestion: null,
          });
        }
      }

      // Check if decorator has opening paren but no closing
      if (trimmed.includes("(") && !trimmed.includes(")")) {
        issues.push({
          line: idx + 1,
          code_snippet: trimmed,
          error_type: "syntax_error",
          message: `Decorator '@${decoratorName}' tiene paréntesis sin cerrar`,
          suggestion: null,
        });
      }
    }
  });

  return issues;
}

/**
 * Detectar properties de @Component mal usadas
 */
function detectComponentPropertyIssues(code: string): Issue[] {
  const issues: Issue[] = [];
  const lines = code.split("\n");

  // Detectar @Component sin selector (error común)
  const componentRegex = /@Component\s*\(\s*\{/g;
  let match;

  while ((match = componentRegex.exec(code)) !== null) {
    const lineNum = code.slice(0, match.index).split("\n").length;
    const afterMatch = code.slice(match.index);

    // Buscar si tiene selector en los primeros 200 chars después de @Component({
    const componentBlock = afterMatch.slice(0, 500);
    const selectorMatch = componentBlock.match(/selector\s*:\s*['"`][^'"`]+['"`]/);

    if (!selectorMatch) {
      issues.push({
        line: lineNum,
        code_snippet: lines[lineNum - 1].trim(),
        error_type: "angular_warning",
        message: "@Component debe tener 'selector' definido",
        suggestion: "Agregar selector: 'app-nombre-componente'",
      });
    }

    // Detectar uso de template en lugar de templateUrl o viceversa
    const templateMatch = componentBlock.match(/template\s*:\s*['"`]/);
    const templateUrlMatch = componentBlock.match(/templateUrl\s*:\s*['"`]/);

    if (templateMatch && templateUrlMatch) {
      issues.push({
        line: lineNum,
        code_snippet: lines[lineNum - 1].trim(),
        error_type: "angular_warning",
        message: "@Component tiene ambos 'template' y 'templateUrl'. Usa solo uno.",
        suggestion: "Elimina 'template' o 'templateUrl'",
      });
    }

    // Detectar uso de styles en lugar de styleUrls o viceversa
    const stylesMatch = componentBlock.match(/styles\s*:\s*\["/);
    const styleUrlsMatch = componentBlock.match(/styleUrls\s*:\s*\["/);

    if (stylesMatch && styleUrlsMatch) {
      issues.push({
        line: lineNum,
        code_snippet: lines[lineNum - 1].trim(),
        error_type: "angular_warning",
        message: "@Component tiene ambos 'styles' y 'styleUrls'. Usa solo uno.",
        suggestion: "Elimina 'styles' o 'styleUrls'",
      });
    }
  }

  return issues;
}

/**
 * Detectar lifecycle hooks mal implementados
 */
function detectLifecycleHookIssues(code: string): Issue[] {
  const issues: Issue[] = [];
  const lines = code.split("\n");

  const classMatch = code.match(/class\s+(\w+)(?:\s+extends\s+\w+)?\s*\{/g);
  if (!classMatch) return issues;

  // Detectar métodos que parecen lifecycle hooks pero no tienen la firma correcta
  const ngOnInitRegex = /ngOnInit\s*\(\s*\)/g;
  let match;

  while ((match = ngOnInitRegex.exec(code)) !== null) {
    const lineNum = code.slice(0, match.index).split("\n").length;
    const beforeMatch = code.slice(Math.max(0, match.index - 200), match.index);

    // ngOnInit debe ser parte de una clase que implementa OnInit
    if (!beforeMatch.includes("implements") || !beforeMatch.includes("OnInit")) {
      issues.push({
        line: lineNum,
        code_snippet: lines[lineNum - 1].trim(),
        error_type: "angular_warning",
        message: "ngOnInit() debería estar en una clase que implementa OnInit",
        suggestion: "Agregar 'implements OnInit' a la declaración de la clase",
      });
    }
  }

  // Detectar ngOnChanges sin parámetro
  const ngOnChangesRegex = /ngOnChanges\s*\(\s*\)/g;
  while ((match = ngOnChangesRegex.exec(code)) !== null) {
    const lineNum = code.slice(0, match.index).split("\n").length;
    const beforeMatch = code.slice(Math.max(0, match.index - 200), match.index);

    if (!beforeMatch.includes("implements") || !beforeMatch.includes("OnChanges")) {
      issues.push({
        line: lineNum,
        code_snippet: lines[lineNum - 1].trim(),
        error_type: "angular_warning",
        message: "ngOnChanges() requiere parámetro 'changes: SimpleChanges'",
        suggestion: "Firma correcta: ngOnChanges(changes: SimpleChanges)",
      });
    }
  }

  return issues;
}

/**
 * Detectar imports de Angular mal formados
 */
function detectAngularImportIssues(code: string): Issue[] {
  const issues: Issue[] = [];
  const lines = code.split("\n");

  // Detectar imports de @angular sin path completo
  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // import { ... } from '@angular/...' - OK
    // import { ... } from 'angular/...' - MAL (falta @)
    const badAngularImport = trimmed.match(/^import\s+\{[^}]+\}\s+from\s+['"]angular\//);
    if (badAngularImport) {
      issues.push({
        line: idx + 1,
        code_snippet: trimmed,
        error_type: "import_error",
        message: "Import de Angular incorrecto. Usa '@angular/...' no 'angular/...'",
        suggestion: trimmed.replace("from 'angular/", "from '@angular/").replace('from "angular/', 'from "@angular/'),
      });
    }

    // Detectar CommonModule vs BrowserModule (común confusión en imports)
    if (trimmed.includes("import { BrowserModule }") && trimmed.includes("from '@angular/platform-browser'")) {
      // BrowserModule solo debe importarse una vez en AppModule
      const moduleMatch = code.match(/@NgModule\s*\{[^}]*bootstrap[^}]*\}/s);
      if (!moduleMatch) {
        issues.push({
          line: idx + 1,
          code_snippet: trimmed,
          error_type: "angular_warning",
          message: "BrowserModule es para el módulo raíz. En módulos feature usa CommonModule.",
          suggestion: "Reemplazar BrowserModule por CommonModule",
        });
      }
    }
  });

  return issues;
}

/**
 * Detectar uso incorrecto de RxJS
 */
function detectRxJSIssues(code: string): Issue[] {
  const issues: Issue[] = [];
  const lines = code.split("\n");

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Detectar .subscribe sin unsubscribe (memory leak potencial)
    const subscribeMatch = trimmed.match(/\.subscribe\s*\(/);
    if (subscribeMatch) {
      // Buscar si hay takeUntil o unsubscribe
      const context = code.slice(Math.max(0, idx - 500), idx + 200);
      const hasCleanup =
        context.includes("takeUntil") ||
        context.includes("unsubscribe()") ||
        context.includes("Subscription") ||
        context.includes("@Injectable") && context.includes("providedIn: 'root'");

      if (!hasCleanup && !context.includes("async")) {
        // Solo warn en componentes (no injectables root)
        const inComponent = context.includes("@Component");
        if (inComponent) {
          issues.push({
            line: idx + 1,
            code_snippet: trimmed,
            error_type: "angular_warning",
            message: "subscribe() sin cleanup puede causar memory leaks",
            suggestion: "Usa takeUntil(pattern) o almacena y destruye la subscription",
          });
        }
      }
    }

    // Detectar operators mal encadenados
    const badOperatorChain = trimmed.match(/\.\w+\([^)]*\)\s*\.\w+\([^)]*\)\s*\)[\s;]*$/);
    if (badOperatorChain && !trimmed.includes(".pipe(")) {
      issues.push({
        line: idx + 1,
        code_snippet: trimmed,
        error_type: "rxjs_warning",
        message: "Operators de RxJS deben encadenarse dentro de .pipe()",
        suggestion: "Encadena operators dentro de .pipe(): observable.pipe(map(...), filter(...))",
      });
    }
  });

  return issues;
}

/**
 * Detectar problemas con @Injectable y providers
 */
function detectInjectableIssues(code: string): Issue[] {
  const issues: Issue[] = [];
  const lines = code.split("\n");

  // Detectar @Injectable sin providedIn
  const injectableRegex = /@Injectable\s*\(\s*\{?\s*\}/g;
  let match;

  while ((match = injectableRegex.exec(code)) !== null) {
    const lineNum = code.slice(0, match.index).split("\n").length;
    const afterMatch = code.slice(match.index, match.index + 100);

    if (!afterMatch.includes("providedIn")) {
      issues.push({
        line: lineNum,
        code_snippet: lines[lineNum - 1].trim(),
        error_type: "angular_warning",
        message: "@Injectable() debería especificar 'providedIn'",
        suggestion: "Agregar providedIn: 'root' para servicios singleton",
      });
    }
  }

  // Detectar providedIn mal escrito
  const badProvidedIn = code.match(/providedIn\s*:\s*['"]root['"]/g);
  // Already handled by typos

  return issues;
}

/**
 * Función principal para detectar issues en código Angular
 */
export function detectAngularIssues(code: string): Issue[] {
  const issues: Issue[] = [];

  // Detectar typos
  issues.push(...detectAngularTypos(code));

  // Detectar decoradores mal formados
  issues.push(...detectAngularDecoratorIssues(code));

  // Detectar properties de @Component
  issues.push(...detectComponentPropertyIssues(code));

  // Detectar lifecycle hooks
  issues.push(...detectLifecycleHookIssues(code));

  // Detectar imports
  issues.push(...detectAngularImportIssues(code));

  // Detectar RxJS
  issues.push(...detectRxJSIssues(code));

  // Detectar @Injectable
  issues.push(...detectInjectableIssues(code));

  return issues;
}

/**
 * Verificar código Angular (alias para detectAngularIssues)
 */
export function verifyAngular(code: string): Issue[] {
  return detectAngularIssues(code);
}
