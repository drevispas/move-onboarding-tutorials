/**
 * aptos move test --named-addresses hello_blockchain=ad3962458c2b2872fae70cc4dd48466815f21037e7217124ecd2b0da3896e1ca
 * aptos move publish --named-addresses hello_blockchain=ad3962458c2b2872fae70cc4dd48466815f21037e7217124ecd2b0da3896e1ca
 * aptos move run --function-id default::message::set_message --args "string:Hello, World"
 * aptos move run --function-id default::message::set_message --args "string:Hello, World, again"
 * https://fullnode.devnet.aptoslabs.com/v1/accounts/0xad3962458c2b2872fae70cc4dd48466815f21037e7217124ecd2b0da3896e1ca/events/0xad3962458c2b2872fae70cc4dd48466815f21037e7217124ecd2b0da3896e1ca::message::Greeting/message_change_event
 */

module hello_blockchain::message {

  use std::error;
  use std::signer;
  use std::string::String;
  use aptos_framework::account;
  use aptos_framework::event;
  use aptos_framework::event::EventHandle;
  #[test_only]
  use std::string::utf8;

  struct Greeting has key {
    message: String,
    message_change_event: EventHandle<MessageChangeEvent>
  }

  // https://fullnode.devnet.aptoslabs.com/v1/accounts/0xad3962458c2b2872fae70cc4dd48466815f21037e7217124ecd2b0da3896e1ca/events/0xad3962458c2b2872fae70cc4dd48466815f21037e7217124ecd2b0da3896e1ca::message::Greeting/message_change_event
  struct MessageChangeEvent has drop, store {
    from_message: String,
    to_message: String
  }

  const ENO_MESSAGE: u64 = 0;

  #[view]
  public fun get_message(addr:address): String acquires Greeting {
    assert!(exists<Greeting>(addr), error::not_found(ENO_MESSAGE));
    borrow_global<Greeting>(addr).message
  }

  public entry fun set_message(account:signer, message:String) acquires Greeting {
    let account_addr=signer::address_of(&account);
    if(!exists<Greeting>(account_addr)) {
      move_to(&account, Greeting{
        message: message,
        message_change_event: account::new_event_handle<MessageChangeEvent>(&account)
      })
    } else {
      let old_greeting = borrow_global_mut<Greeting>(account_addr);
      let from_message=old_greeting.message;
      let to_message=copy message;
      event::emit_event(
        &mut old_greeting.message_change_event,
        MessageChangeEvent {
          from_message, to_message
        }
      );
      old_greeting.message=message;
    }
  }

  #[test(account=@0x1)]
  public entry fun sender_can_set_message(account:signer) acquires Greeting {
    let addr=signer::address_of(&account);
    account::create_account_for_test(addr);
    set_message(account, utf8(b"Hello, Blocko!"));
    assert!(get_message(addr)==utf8(b"Hello, Blocko!"), ENO_MESSAGE);
  }
}
