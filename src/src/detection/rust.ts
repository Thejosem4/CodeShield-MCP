/**
 * Rust Detection Engine
 *
 * Detects hallucinations in Rust code by verifying:
 * - Stdlib crates and their methods (std, collections, io, fs, etc.)
 * - Common typos in Rust keywords and methods
 * - Syntax errors (unbalanced brackets, braces, parentheses)
 */

import type { Issue, ImportInfo } from "./index.js";

// Rust Stdlib
export const RUST_STDLIB: Record<string, Set<string>> = {
  // Core prelude items
  std: new Set([
    "println", "print", "eprintln", "eprint", "format", "format_args",
    "panic", "assert", "assert_eq", "assert_ne", "debug_assert",
    "dbg", "todo", "unimplemented", "unreachable", "abort",
    "exit", "drop", "size_of", "size_of_val", "align_of", "forget",
    "volatile", "needs_drop", "fccvt", "from_utf8", "from_utf8_unchecked",
    "from_raw_parts", "from_raw_parts_mut", "write_bytes", "fill_bytes",
  ]),

  // std::vec
  vec: new Set([
    "new", "with_capacity", "from", "from_fn", "from_iter",
    "push", "pop", "insert", "remove", "push_slice", "extend",
    "extend_from_slice", "append", "clear", "resize", "resize_with",
    "truncate", "shrink_to_fit", "shrink_to", "reserve", "reserve_exact",
    "len", "is_empty", "capacity", "split_off", "resize_default_if",
    "get", "get_mut", "first", "first_mut", "last", "last_mut",
    "iter", "iter_mut", "into_iter", "drain", "drain_filter",
    "swap", "swap_remove", "reverse", "sort", "sort_unstable",
    "sort_by", "sort_unstable_by", "contains", "binary_search",
    "binary_search_by", "partition", "concat", "join", "pop_at",
  ]),

  // std::string
  string: new Set([
    "new", "from", "from_utf8", "from_utf8_lossy", "from_utf16",
    "from_utf16le", "from_utf16_bytes", "from_raw_parts",
    "with_capacity", "into_bytes", "into_boxed_bytes", "push",
    "push_str", "pop", "truncate", "set_len", "capacity",
    "reserve", "reserve_exact", "shrink_to", "len", "is_empty",
    "clear", "bytes", "chars", "split_whitespace", "split",
    "lines", "contains", "starts_with", "ends_with", "find",
    "rfind", "find_bytes", "replace", "to_lowercase", "to_uppercase",
    "to_string", "to_owned", "clone", "into_string", "as_str",
    "as_bytes", "as_mut_str", "as_ptr", "as_bytes",
  ]),

  // std::option
  option: new Set([
    "Some", "None", "is_some", "is_none",
    "unwrap", "expect", "unwrap_or", "unwrap_or_else", "unwrap_or_default",
    "map", "and_then", "or_else", "or", "get_or_insert", "get_or_insert_with",
    "ok_or", "ok_or_else", "err", "map_err", "and", "take", "replace",
    "iter", "iter_mut", "ok", "flatten",
  ]),

  // std::result
  result: new Set([
    "Ok", "Err", "is_ok", "is_err",
    "unwrap", "expect", "unwrap_or", "unwrap_or_else", "unwrap_or_default",
    "unwrap_unchecked", "expect_err", "unwrap_err", "unwrap_err_unchecked",
    "map", "map_err", "and_then", "or_else", "or", "ok", "err",
    "contains", "contains_err", "flatten",
  ]),

  // std::collections - HashMap
  hashmap: new Set([
    "new", "with_capacity", "from", "from_iter", "from_array",
    "insert", "remove", "get", "get_mut", "get_key_value", "contains_key",
    "contains_value", "len", "is_empty", "clear", "reserve", "reserve_exact",
    "shrink_to", "shrink_to_fit", "keys", "values", "values_mut",
    "entries", "iter", "iter_mut", "into_iter", "into_keys", "into_values",
    "entry", "merge", "append", "retain", "extend", "is_subset", "is_superset",
  ]),

  // std::collections - HashSet
  hashset: new Set([
    "new", "with_capacity", "from", "from_iter", "from_array",
    "insert", "remove", "get", "contains", "len", "is_empty", "clear",
    "reserve", "reserve_exact", "shrink_to", "shrink_to_fit",
    "iter", "into_iter", "union", "intersection", "difference", "symmetric_difference",
    "is_disjoint", "is_subset", "is_superset", "supplement", "append",
    "retain", "extend", "toggle", "pop", "take",
  ]),

  // std::collections - BTreeMap
  btreemap: new Set([
    "new", "from", "from_iter", "from_array",
    "insert", "remove", "get", "get_mut", "get_key_value", "contains_key",
    "len", "is_empty", "clear", "append", "entry",
    "keys", "values", "values_mut", "iter", "iter_mut", "into_iter",
    "into_keys", "into_values", "range", "range_mut",
    "first_key", "last_key", "first_entry", "last_entry",
    "pop_first", "pop_last", "retain",
  ]),

  // std::collections - BTreeSet
  btreeset: new Set([
    "new", "from", "from_iter", "from_array",
    "insert", "remove", "get", "contains", "len", "is_empty", "clear",
    "append", "replace",
    "iter", "into_iter", "range", "first", "last",
    "pop_first", "pop_last", "take", "retain",
    "union", "intersection", "difference", "symmetric_difference",
    "is_disjoint", "is_subset", "is_superset",
  ]),

  // std::collections - VecDeque
  vecdeque: new Set([
    "new", "with_capacity", "from", "from_iter",
    "push_front", "push_back", "pop_front", "pop_back", "pop_back_internal",
    "push", "pop", "insert", "remove", "len", "is_empty", "clear",
    "capacity", "reserve", "reserve_exact", "shrink_to_fit",
    "iter", "iter_mut", "into_iter", "drain", "make_contiguous",
    "front", "back", "front_mut", "back_mut", "get", "get_mut",
    "is_full", "append", "extend", "retain", "retain_mut",
    "rotate_left", "rotate_right", "binary_search", "sort",
  ]),

  // std::collections - LinkedList
  linkedlist: new Set([
    "new", "from", "from_iter",
    "push_front", "push_back", "pop_front", "pop_back",
    "len", "is_empty", "clear",
    "iter", "iter_mut", "into_iter", "front", "back", "front_mut", "back_mut",
    "append", "prepend", "extend", "remove", "split_off", "retain",
  ]),

  // std::io - Read
  read: new Set([
    "read", "read_to_end", "read_to_string", "read_at", "read_exact",
    "read_buf", "read_buf_exact", "read_vectored", "is_read_vectored",
    "read_to_end", "read_exact", "bytes", "chain", "take",
  ]),

  // std::io - Write
  write: new Set([
    "write", "write_all", "write_vectored", "is_write_vectored",
    "write_fmt", "write_all_buf", "flush", "write_at",
    "write_to", "write_all_to",
  ]),

  // std::io - BufRead
  bufread: new Set([
    "read_line", "lines", "split", "borrow", "read_until", "read_exact",
    "fill_buf", "consume", "has_possibly_remaining",
  ]),

  // std::io - stdin/stdout/stderr
  stdin: new Set(["read_line", "lines", "read_to_end", "read_to_string", "lock"]),
  stdout: new Set(["write", "write_all", "flush", "lock", "write_fmt"]),
  stderr: new Set(["write", "write_all", "flush", "lock", "write_fmt"]),

  // std::fs - File and operations
  fs: new Set([
    "read_to_string", "read", "write", "read_to_end", "copy",
    "create", "create_dir", "create_dir_all", "remove", "remove_dir",
    "remove_dir_all", "remove_file", "rename", "exists", "metadata",
    "symlink_metadata", "hard_link", "soft_link", "read_link",
    "read_dir", "real_path", "stat", "lstat", "fstat",
    "OpenOptions", "File", "read_dir", "DirBuilder",
  ]),

  // std::fs::OpenOptions
  openoptions: new Set([
    "new", "append", "create", "create_new", "read", "truncate", "write", "open",
  ]),

  // std::path
  path: new Set([
    "Path", "PathBuf", "new", "from", "join", "join_path",
    "extension", "file_name", "file_stem", "parent", "ancestors",
    "is_file", "is_dir", "is_symlink", "exists", "has_root",
    "root", "strip_prefix", "strip_suffix", "starts_with", "ends_with",
    "canonicalize", "components", "iter", "with_extension",
    "set_file_name", "set_extension", "push", "pop", "into_os_string",
    "to_str", "to_string_lossy", "to_path_buf", "as_os_str", "as_path",
  ]),

  // std::env
  env: new Set([
    "args", "args_os", "vars", "vars_os", "current_dir", "set_current_dir",
    "home_dir", "temp_dir", "temp_dir_as_file", "set_var", "remove_var",
    "var", "var_os", "join", "split", "split_first", "current_exe",
    "current_exe", "logger", "var", "consts", "os", "arch",
  ]),

  // std::process
  process: new Set([
    "Command", "exit", "id", "kill", "wait", "wait_with_output",
    "stdout", "stderr", "stdin", "arg", "args", "env", "current_dir",
    "output", "status", "spawn", "try_wait",
  ]),

  // std::thread
  thread: new Set([
    "spawn", "spawn_builder", "sleep", "current", "park", "unpark",
    "yield_now", "Builder", "current_thread", "Thread", "thread_info",
    "available_concurrency", "park_timeout", "sleep_until",
  ]),

  // std::sync - Mutex
  mutex: new Set([
    "new", "lock", "try_lock", "is_poisoned", "get_mut", "into_inner",
    "guard", "PoisonError",
  ]),

  // std::sync - RwLock
  rwlock: new Set([
    "new", "read", "try_read", "write", "try_write", "is_poisoned",
    "get_mut", "into_inner", "read_guard", "write_guard",
  ]),

  // std::sync - Arc
  arc: new Set([
    "new", "new_unwrap", "try_new", "from_raw", "into_raw", "as_ptr",
    "ptr_eq", "downgrade", "strong_count", "weak_count", "get_mut",
    "is_unique", "make_mut", "clone", "Deref", "deref", "deref_mut",
  ]),

  // std::sync - atomic
  atomic: new Set([
    "AtomicBool", "AtomicI8", "AtomicI16", "AtomicI32", "AtomicI64", "AtomicIsize",
    "AtomicU8", "AtomicU16", "AtomicU32", "AtomicU64", "AtomicUsize",
    "AtomicPtr",
    "new", "get", "set", "load", "store", "swap",
    "compare_exchange", "compare_exchange_weak", "fetch_add", "fetch_sub",
    "fetch_and", "fetch_or", "fetch_xor", "fetch_nand", "fetch_update",
    "notify_one", "notify_all", "fence", "song",
  ]),

  // std::time
  time: new Set([
    "Duration", "Instant", "SystemTime", "UNIX_EPOCH",
    "now", "elapsed", "checked_add", "checked_sub", "saturating_add",
    "saturating_sub", "as_secs", "as_millis", "as_micros", "as_nanos",
    "from_secs", "from_millis", "from_micros", "from_nanos",
    "from_time_t", "to_time_t", "subsec_secs", "subsec_nanos",
    "strace", "strftime", "format", "parse", "now", "simd_process_time",
  ]),

  // std::error
  error: new Set([
    "Error", "Display", "Debug", "source", "description", "cause",
    "provide", "request_value", "request_ref",
  ]),

  // std::fmt
  fmt: new Set([
    "format", "format_args", "format_args", "Formatter", "Arguments",
    "Debug", "Display", "Octal", "Binary", "LowerHex", "UpperHex",
    "LowerExp", "UpperExp", "Pointer", "Write", "Result",
  ]),

  // std::slice
  slice: new Set([
    "len", "is_empty", "first", "last", "split_first", "split_last",
    "get", "get_mut", "get_unchecked", "get_unchecked_mut",
    "as_ptr", "as_mut_ptr", "as_slice", "as_mut_slice",
    "iter", "iter_mut", "into_iter", "windows", "chunks", "chunks_mut",
    "split", "split_mut", "rsplit", "rsplit_mut", "split_at", "split_at_mut",
    "rotate_left", "rotate_right", "sort", "sort_unstable", "sort_by",
    "sort_unstable_by", "binary_search", "binary_search_by", "contains",
    "starts_with", "ends_with", "find", "rfind", "iter_mut", "swap",
    "swap_unchecked", "copy", "copy_nonoverlapping", "fill", "fill_with",
    "clone_from_slice", "copy_from_slice", "to_vec", "to_vec", "to_owned",
  ]),

  // std::str
  str: new Set([
    "from_utf8", "from_utf8_mut", "from_utf8_unchecked", "from_utf8_lossy",
    "len", "is_empty", "as_bytes", "as_mut_str", "as_ptr", "chars",
    "char_indices", "bytes", "lines", "split", "split_whitespace",
    "split_at", "split_once", "rsplit_once", "contains", "starts_with",
    "ends_with", "find", "rfind", "match", "rmatch", "matches", "rmatches",
    "trim", "trim_start", "trim_end", "trim_matches", "to_lowercase",
    "to_uppercase", "to_string", "to_owned", "to_vec", "repeat",
    "encode_utf8", "encode_utf16", "escape_unicode", "parse",
  ]),

  // std::num
  num: new Set([
    "FromPrimitive", "ToPrimitive", "cast", "checked", "saturating",
    "overflowing", "wrapping", "zero", "one", "BITS", "Signed", "Unsigned",
    "Integer", "Float", "PrimInt", "Int", "Uint", "Sign", "FpCategory",
    "Bignum", "FloatExt", "Pow", "Product", "Sum",
    "checked_add", "checked_sub", "checked_mul", "checked_div", "checked_rem",
    "checked_neg", "checked_shl", "checked_shr",
    "saturating_add", "saturating_sub", "saturating_mul",
    "wrapping_add", "wrapping_sub", "wrapping_mul",
    "overflowing_add", "overflowing_sub", "overflowing_mul",
    "pow", "next_power_of_two", "checked_next_power_of_two",
    "is_power_of_two", "bit_length", "count_ones", "count_zeros",
    "leading_zeros", "trailing_zeros", "rotate_left", "rotate_right", "swap_bytes",
  ]),

  // std::box
  box: new Set([
    "new", "into_raw", "from_raw", "Box", "leak", "into_unique",
    "Pinned", "pin",
  ]),

  // std::rc
  rc: new Set([
    "Rc", "rc", "new", "clone", "strong_count", "weak_count",
    "get_mut", "get_ref", "as_ptr", "ptr_eq", "downgrade", "upgrade",
    "make_mut", "unwrap_or_clone", "into_raw", "from_raw",
  ]),

  // std::cell
  cell: new Set([
    "Cell", "RefCell", "UnsafeCell",
    "new", "get", "set", "update", "with", "borrow", "borrow_mut",
    "try_borrow", "try_borrow_mut", "replace", "take", "as_ptr",
    "get_mut", "into_inner",
  ]),

  // std::marker
  marker: new Set([
    "Send", "Sync", "Sized", "Unpin", "Unsize", "Copy", "Clone",
    "Default", "Drop", "Display", "Debug", "PartialOrd", "Ord",
    "PartialEq", "Eq", "Hash", "AsRef", "AsMut", "From", "Into",
    "CoerceUnsized", "DispatchFromDyn",
  ]),

  // std::ops
  ops: new Set([
    "Deref", "DerefMut", "Drop", "Index", "IndexMut",
    "Add", "Sub", "Mul", "Div", "Rem", "Neg", "Not", "BitAnd", "BitOr", "BitXor", "Shl", "Shr",
    "AddAssign", "SubAssign", "MulAssign", "DivAssign", "RemAssign", "BitAndAssign",
    "BitOrAssign", "BitXorAssign", "ShlAssign", "ShrAssign",
    "Range", "RangeFrom", "RangeTo", "RangeFull", "RangeInclusive", "RangeToInclusive",
    "Index", "Fn", "FnMut", "FnOnce", "Generator", "Yield",
  ]),

  // std::mem
  mem: new Set([
    "size_of", "size_of_val", "align_of", "align_of_val",
    "zeroed", "transmute", "transmute_copy", "replace", "take",
    "swap", "forget", "drop", "needs_drop", "MaybeUninit",
    "ManuallyDrop", "discriminant", "variant_count",
  ]),

  // std::borrow
  borrow: new Set([
    "Borrow", "BorrowMut", "ToOwned", "Cow", "Borrowed", "Owned",
  ]),

  // std::convert
  convert: new Set([
    "AsRef", "AsMut", "AsMut", "From", "Into", "TryFrom", "TryInto",
    "CoerceUnsized", "DispatchFromDyn", "Transmute",
  ]),

  // std::iter
  iter: new Set([
    "next", "next_back", "count", "len", "is_empty", "advance_by",
    "nth", "nth_back", "last", "step_by", "chain", "zip", "map", "filter",
    "filter_map", "enumerate", "peekable", "skip_while", "take_while",
    "map_while", "scan", "flat_map", "flatten", "fuse", "iter", "iter_mut",
    "into_iter", "collect", "fold", "reduce", "sum", "product", "any", "all",
    "find", "find_map", "position", "max", "max_by", "max_by_key", "min",
    "min_by", "min_by_key", "minmax", "minmax_by", "minmax_by_key",
    "rev", "copied", "cloned", "cycle", "add", "take", "skip", "step_by",
    "map", "filter", "enumerate", "inspect", "for_each", "reduce", "collect_vec",
  ]),
};

// Rust Typo database
export const RUST_TYPOS: Record<string, Record<string, string>> = {
  // Option/Result methods
  unwrap: { unrap: "unwrap", unwrp: "unwrap", unwraped: "unwrap", unrap_panic: "unwrap" },
  expect: { expext: "expect", espct: "expect", exspect: "expect", expectt: "expect" },
  is_some: { is_somme: "is_some", is_somo: "is_some", is_somee: "is_some" },
  is_none: { is_nonr: "is_none", is_nonee: "is_none", isnone: "is_none" },
  is_ok: { is_oky: "is_ok", is_okk: "is_ok", iso_k: "is_ok" },
  is_err: { is_erro: "is_err", is_errr: "is_err", iserr: "is_err" },
  Some: { Somme: "Some", Somo: "Some", somee: "Some", Ssome: "Some" },
  None: { Nnone: "None", Nonr: "None", nonee: "None", NOne: "None" },
  Ok: { Oky: "Ok", Okk: "Ok", oK: "Ok", okk: "Ok" },
  Err: { Erro: "Err", Errr: "Err", err: "Err", Errro: "Err" },

  // Macro typos
  println: { printnln: "println", printn: "println", prntln: "println", printlin: "println" },
  print: { prnt: "print", prin: "print", printt: "print" },
  eprintln: { eprintnln: "eprintln", eprntln: "eprintln", eprintn: "eprintln" },
  format: { formatt: "format", formate: "format", frmat: "format" },
  vec: { vecc: "vec", veccc: "vec", vce: "vec", vecc_new: "vec" },

  // Keyword typos
  mut: { muut: "mut", mutt: "mut", mmuut: "mut" },
  ref: { reff: "ref", rref: "ref" },
  let: { leet: "let", lte: "let" },
  fn: { fnn: "fn", ffn: "fn", funtion: "fn" },
  pub: { puub: "pub", pubb: "pub", ppub: "pub" },
  impl: { immp: "impl", impll: "impl", imlp: "impl" },
  struct: { struck: "struct", strct: "struct", structt: "struct" },
  enum: { ennum: "enum", enumt: "enum", enumm: "enum" },
  trait: { traitt: "trait", traiet: "trait" },
  use: { uuse: "use", usse: "use", uze: "use" },
  mod: { md: "mod", modd: "mod", mo: "mod" },
  match: { matck: "match", mtach: "match", mach: "match" },
  where: { wher: "where", wheree: "where", wehre: "where" },
  self_: { selff: "self", slf: "self", slef: "self" },
  super: { superr: "super", supre: "super" },
  crate: { crate_: "crate", crat: "crate" },
  in: { iin: "in", inn: "in" },
  for: { forr: "for", ffor: "for" },
  loop: { looop: "loop", lop: "loop" },
  while: { whille: "while", hwile: "while" },
  return: { reutrn: "return", retrun: "return", retur: "return" },
  move: { mov: "move", movve: "move" },
  unsafe: { unsfe: "unsafe", safee: "unsafe" },
  async: { asnyc: "async", assync: "async" },
  await: { awiat: "await", awate: "await" },

  // Reference/pointer typos
  "&str": { "&astr": "&str", "&sttr": "&str", "&strr": "&str" },
  "&mut": { "&maut": "&mut", "&mutt": "&mut", "&mmut": "&mut" },
  "&": { "and": "&", "&&": "&", "ref": "&" },

  // String/vec common methods
  push: { pus: "push", pushh: "push", ppush: "push" },
  pop: { po: "pop", popp: "pop", ppop: "pop" },
  len: { lne: "len", lenght: "len", leng: "len" },
  is_empty: { isempty: "is_empty", is_emtpy: "is_empty", is_empt: "is_empty" },
  get: { geet: "get", gte: "get", gett: "get" },
  set: { sett: "set", seet: "set" },
  insert: { insrt: "insert", insetr: "insert", inster: "insert" },
  remove: { romove: "remove", remvoe: "remove", remov: "remove" },

  // Type name typos
  String: { Strring: "String", Strimg: "String", Strin: "String" },
  Result: { Resuilt: "Result", Resultt: "Result", Reslt: "Result" },
  Option: { Optiion: "Option", Optoin: "Option", Opton: "Option" },
  Vec: { Vecc: "Vec", Vcec: "Vec", Vc: "Vec" },
  HashMap: { Hashhmap: "HashMap", HshMap: "HashMap", HashMap_: "HashMap" },
  HashSet: { Hashhset: "HashSet", HshSet: "HashSet", HashSett: "HashSet" },
  i32: { i3: "i32", i22: "i32", i322: "i32" },
  i64: { i6: "i64", i44: "i64", i644: "i64" },
  u32: { u3: "u32", u22: "u32", u322: "u32" },
  u64: { u6: "u64", u44: "u64", u644: "u64" },
  f32: { f3: "f32", f22: "f32", f322: "f32" },
  f64: { f6: "f64", f44: "f64", f644: "f64" },
  bool: { boool: "bool", bolean: "bool", bol: "bool" },

  // Iterator method typos
  iter: { itre: "iter", itr: "iter", iterr: "iter" },
  map: { ma: "map", mpa: "map", map_: "map" },
  collect: { colect: "collect", colllect: "collect", collect_: "collect" },
  filter: { filtr: "filter", filte: "filter", filter_: "filter" },
  fold: { fld: "fold", foldd: "fold", ffld: "fold" },
  reduce: { redce: "reduce", reducd: "reduce", reduce_: "reduce" },

  // Ownership/borrowing
  clone: { clne: "clone", clon: "clone", cloon: "clone" },
  copy: { cpy: "copy", coppy: "copy", cp: "copy" },
  borrow: { borrow_: "borrow", borow: "borrow", brrow: "borrow" },
  borrow_mut: { borrow_mutt: "borrow_mut", mutt_borrow: "borrow_mut" },
};

// Rust keywords
const RUST_KEYWORDS = new Set([
  "as", "async", "await", "break", "const", "continue", "crate", "dyn",
  "else", "enum", "extern", "false", "fn", "for", "if", "impl", "in",
  "let", "loop", "match", "mod", "move", "mut", "pub", "ref", "return",
  "self", "Self", "static", "struct", "super", "trait", "true", "type",
  "unsafe", "use", "where", "while",
]);

// Common Rust built-in macros
const RUST_MACROS = new Set([
  "println", "print", "eprintln", "eprint", "format", "format_args",
  "panic", "assert", "assert_eq", "assert_ne", "debug_assert",
  "dbg", "todo", "unimplemented", "unreachable", "vec", "write",
  "writeln", "concat", "concat_idents", "stringify", "include",
  "include_str", "include_bytes", "macro_rules", "cfg", "env",
  "option_env", "concat_idents", "select", "Soy", "vec_deferred",
]);

/**
 * Parse Rust use statements
 * Supports: use module; use module::item; use module::{item1, item2}; use module::item as alias;
 */
export function parseRustImports(code: string): ImportInfo[] {
  const imports: ImportInfo[] = [];
  const lines = code.split("\n");

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // use path;
    // use path::item;
    // use path::{item1, item2};
    // use path::{item1, item2 as alias1};
    // use path::item as alias;
    // use path::{item1, item2::{subitem, subitem2}};
    const useMatch = trimmed.match(/^use\s+(.+?);$/);
    if (useMatch) {
      const path = useMatch[1];
      parseUsePath(path, imports, idx + 1);
    }
  });

  return imports;
}

/**
 * Recursively parse use path components
 */
function parseUsePath(path: string, imports: ImportInfo[], line: number): void {
  // Handle nested paths: {item1, item2::{subitem, subitem2}}
  if (path.startsWith("{") && path.endsWith("}")) {
    const inner = path.slice(1, -1);
    const items = splitUseTree(inner);
    items.forEach((item) => {
      if (item.trim()) {
        parseUsePath(item.trim(), imports, line);
      }
    });
    return;
  }

  // Handle "path::{item1, item2} as alias" or "path::item as alias"
  const asMatch = path.match(/^(.+?)\s+as\s+(\w+)$/);
  if (asMatch) {
    const actualPath = asMatch[1].trim();
    const alias = asMatch[2];
    parseUsePath(actualPath, imports, line);
    // Mark last import with alias
    if (imports.length > 0) {
      imports[imports.length - 1].alias = alias;
    }
    return;
  }

  // Check if it's a multi-item path (comma separated, like module::{a, b})
  const braceMatch = path.match(/^(.+?)::\{(.+)\}$/);
  if (braceMatch) {
    const module = braceMatch[1];
    const items = braceMatch[2];
    const itemList = splitUseTree(items);
    itemList.forEach((item) => {
      const itemTrimmed = item.trim();
      if (itemTrimmed) {
        // Handle item with "as" alias
        const itemAsMatch = itemTrimmed.match(/^(\w+)(?:\s+as\s+(\w+))?$/);
        if (itemAsMatch) {
          imports.push({
            name: itemAsMatch[1],
            alias: itemAsMatch[2] || null,
            from_module: module,
            is_from: true,
            line,
          });
        } else {
          parseUsePath(itemTrimmed, imports, line);
        }
      }
    });
    return;
  }

  // Simple path - could be "module" or "module::item"
  const parts = path.split("::");
  const module = parts[0];
  const item = parts.slice(1).join("::");

  if (item) {
    imports.push({
      name: item,
      alias: null,
      from_module: module,
      is_from: true,
      line,
    });
  } else {
    // Just the module, treat as wildcard or module import
    imports.push({
      name: module,
      alias: null,
      from_module: null,
      is_from: false,
      line,
    });
  }
}

/**
 * Split use tree items respecting nested braces
 */
function splitUseTree(inner: string): string[] {
  const items: string[] = [];
  let current = "";
  let depth = 0;

  for (const char of inner) {
    if (char === "{") {
      depth++;
      current += char;
    } else if (char === "}") {
      depth--;
      current += char;
    } else if (char === "," && depth === 0) {
      items.push(current);
      current = "";
    } else {
      current += char;
    }
  }

  if (current.trim()) {
    items.push(current);
  }

  return items;
}

/**
 * Detect typos in Rust code
 */
function detectRustTypos(code: string): Issue[] {
  const issues: Issue[] = [];
  const lines = code.split("\n");

  lines.forEach((line, idx) => {
    // Check for known typos
    for (const [category, typos] of Object.entries(RUST_TYPOS)) {
      const typoMap = typos as Record<string, string>;
      for (const [typo, correction] of Object.entries(typoMap)) {
        // Match whole word only (avoid partial matches in strings/comments)
        const regex = new RegExp(`\\b${escapeRegex(typo)}\\b`);
        if (regex.test(line)) {
          // Avoid flagging comments
          const beforeComment = line.split("//")[0];
          if (beforeComment.includes(typo)) {
            issues.push({
              line: idx + 1,
              code_snippet: line.trim(),
              error_type: "typo",
              message: `Possible typo '${typo}' - did you mean '${correction}'?`,
              suggestion: correction,
            });
          }
        }
      }
    }
  });

  return issues;
}

/**
 * Detect basic syntax errors in Rust code
 */
function detectRustSyntaxErrors(code: string): Issue[] {
  const issues: Issue[] = [];
  const lines = code.split("\n");

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    // Skip comments and strings
    if (trimmed.startsWith("//") || trimmed.startsWith("/*") || trimmed.startsWith("*/")) {
      return;
    }

    // Parenthesis balance
    const openParen = (trimmed.match(/\(/g) || []).length;
    const closeParen = (trimmed.match(/\)/g) || []).length;
    if (Math.abs(openParen - closeParen) > 1) {
      issues.push({
        line: idx + 1,
        code_snippet: trimmed,
        error_type: "syntax_error",
        message: "Unbalanced parentheses",
        suggestion: null,
      });
    }

    // Brace balance
    const openBrace = (trimmed.match(/\{/g) || []).length;
    const closeBrace = (trimmed.match(/\}/g) || []).length;
    if (openBrace !== closeBrace) {
      issues.push({
        line: idx + 1,
        code_snippet: trimmed,
        error_type: "syntax_error",
        message: "Unbalanced braces",
        suggestion: null,
      });
    }

    // Bracket balance
    const openBracket = (trimmed.match(/\[/g) || []).length;
    const closeBracket = (trimmed.match(/\]/g) || []).length;
    if (openBracket !== closeBracket) {
      issues.push({
        line: idx + 1,
        code_snippet: trimmed,
        error_type: "syntax_error",
        message: "Unbalanced brackets",
        suggestion: null,
      });
    }

    // Angle brackets (generics) - less strict check
    const openAngle = (trimmed.match(/</g) || []).length;
    const closeAngle = (trimmed.match(/>/g) || []).length;
    if (openAngle > 0 || closeAngle > 0) {
      if (Math.abs(openAngle - closeAngle) > 1) {
        issues.push({
          line: idx + 1,
          code_snippet: trimmed,
          error_type: "syntax_error",
          message: "Unbalanced angle brackets (generics)",
          suggestion: null,
        });
      }
    }
  });

  return issues;
}

/**
 * Detect usage of non-existent methods on Rust stdlib types
 */
function detectRustMethodIssues(code: string): Issue[] {
  const issues: Issue[] = [];
  const lines = code.split("\n");

  // Patterns to match: Type.method( or variable.method(
  // Types to check: String, Vec, Option, Result, HashMap, HashSet, etc.
  const typeMethodPattern = /\b(String|Vec|Option|Result|HashMap|HashSet|BTreeMap|BTreeSet|VecDeque|Path|PathBuf|Box|Rc|Arc|Mutex|RwLock|Cell|RefCell)\.(\w+)\s*\(/g;
  // Also check for lowercase variable.method patterns
  const varMethodPattern = /\b([a-z][a-z0-9_]*)\.(\w+)\s*\(/g;

  lines.forEach((line, idx) => {
    // Skip comments
    if (line.trim().startsWith("//")) {
      return;
    }

    // Check type method calls
    let match: RegExpExecArray | null;
    while ((match = typeMethodPattern.exec(line)) !== null) {
      const type = match[1];
      const method = match[2];

      // Check if this type exists in our stdlib
      const typeKey = type.toLowerCase() as keyof typeof RUST_STDLIB;
      const stdlibMethods = RUST_STDLIB[typeKey] || RUST_STDLIB[type.charAt(0).toLowerCase() + type.slice(1)];

      if (stdlibMethods && !stdlibMethods.has(method)) {
        // Check for typos
        let suggestion: string | null = null;
        const typoCategory = RUST_TYPOS[typeKey] || RUST_TYPOS[type.toLowerCase()];
        if (typoCategory) {
          const typoMatch = (typoCategory as Record<string, string>)[method];
          if (typoMatch) {
            suggestion = typoMatch;
          }
        }

        issues.push({
          line: idx + 1,
          code_snippet: line.trim(),
          error_type: "method_not_found",
          message: `'${type}.${method}' is not a valid method`,
          suggestion,
        });
      }
    }

    // Reset regex lastIndex
    varMethodPattern.lastIndex = 0;
    while ((match = varMethodPattern.exec(line)) !== null) {
      const varName = match[1];
      const method = match[2];

      // Skip if it looks like a keyword or known identifier
      if (RUST_KEYWORDS.has(varName) || RUST_MACROS.has(varName)) {
        continue;
      }

      // Check if the method is a known typo
      for (const [, typos] of Object.entries(RUST_TYPOS)) {
        const typoMap = typos as Record<string, string>;
        if (typoMap[method]) {
          issues.push({
            line: idx + 1,
            code_snippet: line.trim(),
            error_type: "typo",
            message: `Possible typo '${method}' - did you mean '${typoMap[method]}'?`,
            suggestion: typoMap[method],
          });
        }
      }
    }
  });

  return issues;
}

/**
 * Main detection function for Rust code
 */
export function detectRustIssues(code: string): Issue[] {
  const issues: Issue[] = [];

  // Detect syntax errors
  issues.push(...detectRustSyntaxErrors(code));

  // Detect typos
  issues.push(...detectRustTypos(code));

  // Detect method issues
  issues.push(...detectRustMethodIssues(code));

  return issues;
}

/**
 * Main verification function for Rust code
 */
export function verifyRust(code: string): Issue[] {
  return detectRustIssues(code);
}

/**
 * Fix typos in Rust code
 */
export function fixRust(code: string): string {
  let fixed = code;

  for (const [, typos] of Object.entries(RUST_TYPOS)) {
    const typoMap = typos as Record<string, string>;
    for (const [typo, correction] of Object.entries(typoMap)) {
      // Match whole word, case-sensitive
      const escapedTypo = escapeRegex(typo);
      const pattern = new RegExp(`\\b${escapedTypo}\\b`, "g");
      fixed = fixed.replace(pattern, correction);
    }
  }

  return fixed;
}

/**
 * Escape special regex characters
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Check if a module path is a known Rust stdlib crate
 */
export function isRustStdlib(module: string): boolean {
  const stdlibCrates = new Set([
    "std", "core", "alloc", "proc_macro", "test", "panic",
    "std::vec", "std::string", "std::option", "std::result",
    "std::collections", "std::io", "std::fs", "std::path",
    "std::env", "std::process", "std::thread", "std::sync",
    "std::time", "std::error", "std::fmt", "std::slice",
    "std::str", "std::num", "std::box", "std::rc", "std::cell",
    "std::marker", "std::ops", "std::mem", "std::borrow",
    "std::convert", "std::iter",
  ]);

  return stdlibCrates.has(module) || stdlibCrates.has(module.split("::")[0]);
}
