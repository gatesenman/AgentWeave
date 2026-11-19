use agentweave_core::pack::{
    parse_pack, serialize_pack, starter_config, validate_pack, WeavePack, WEAVE_PACK_KIND,
};

#[test]
fn starter_pack_round_trips() {
    let pack = WeavePack::new(starter_config("demo-project"));
    let text = serialize_pack(&pack).expect("serialize");
    assert!(text.contains("\"kind\": \"weave-pack\""));
    let again = parse_pack(&text).expect("parse");
    assert_eq!(again.kind, WEAVE_PACK_KIND);
    assert_eq!(again.config.metadata.name, "demo-project");
    validate_pack(&again).expect("valid");
}

#[test]
fn rejects_empty_name_and_bad_kind() {
    let mut pack = WeavePack::new(starter_config("ok"));
    pack.kind = "nope".into();
    assert!(validate_pack(&pack).is_err());
    pack.kind = WEAVE_PACK_KIND.into();
    pack.config.metadata.name = "  ".into();
    assert!(validate_pack(&pack).is_err());
    assert!(parse_pack("not-json").is_err());
}
