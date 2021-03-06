var SuperVillain, EvilMinion, YellowMinion, DoomsdayDevice, MediocreVillain, env;
var run = Ember.run;

module("integration/active_model - AMS-namespaced-model-names", {
  setup: function() {
    SuperVillain = DS.Model.extend({
      firstName:     DS.attr('string'),
      lastName:      DS.attr('string'),
      evilMinions:   DS.hasMany("evilMinion")
    });

    EvilMinion = DS.Model.extend({
      superVillain: DS.belongsTo('superVillain'),
      name:         DS.attr('string')
    });
    YellowMinion = EvilMinion.extend();
    DoomsdayDevice = DS.Model.extend({
      name:         DS.attr('string'),
      evilMinion:   DS.belongsTo('evilMinion', { polymorphic: true })
    });
    MediocreVillain = DS.Model.extend({
      name:         DS.attr('string'),
      evilMinions:  DS.hasMany('evilMinion', { polymorphic: true })
    });
    env = setupStore({
      superVillain:   SuperVillain,
      evilMinion:     EvilMinion,
      'evilMinions/yellowMinion':   YellowMinion,
      doomsdayDevice: DoomsdayDevice,
      mediocreVillain: MediocreVillain
    });
    env.store.modelFor('superVillain');
    env.store.modelFor('evilMinion');
    env.store.modelFor('evilMinions/yellowMinion');
    env.store.modelFor('doomsdayDevice');
    env.store.modelFor('mediocreVillain');
    env.registry.register('serializer:application', DS.ActiveModelSerializer);
    env.registry.register('serializer:-active-model', DS.ActiveModelSerializer);
    env.registry.register('adapter:-active-model', DS.ActiveModelAdapter);
    env.amsSerializer = env.container.lookup("serializer:-active-model");
    env.amsAdapter    = env.container.lookup("adapter:-active-model");
  },

  teardown: function() {
    run(env.store, 'destroy');
  }
});

test("serialize polymorphic", function() {
  var tom, ray;
  run(function() {
    tom = env.store.createRecord('evilMinions/yellowMinion', { name: "Alex", id: "124" });
    ray = env.store.createRecord(DoomsdayDevice, { evilMinion: tom, name: "DeathRay" });
  });

  var json = env.amsSerializer.serialize(ray._createSnapshot());

  deepEqual(json, {
    name: "DeathRay",
    evil_minion_type: "EvilMinions::YellowMinion",
    evil_minion_id: "124"
  });
});

test("serialize polymorphic when type key is not camelized", function() {
  YellowMinion.typeKey = 'evil-minions/yellow-minion';
  var tom, ray;
  run(function() {
    tom = env.store.createRecord(YellowMinion, { name: "Alex", id: "124" });
    ray = env.store.createRecord(DoomsdayDevice, { evilMinion: tom, name: "DeathRay" });
  });

  var json = env.amsSerializer.serialize(ray._createSnapshot());

  deepEqual(json["evil_minion_type"], "EvilMinions::YellowMinion");
});

test("extractPolymorphic hasMany", function() {
  var json_hash = {
    mediocre_villain: { id: 1, name: "Dr Horrible", evil_minions: [{ type: "EvilMinions::YellowMinion", id: 12 }] },
    evil_minions:    [{ id: 12, name: "Alex", doomsday_device_ids: [1] }]
  };
  var json;

  run(function() {
    json = env.amsSerializer.extractSingle(env.store, MediocreVillain, json_hash);
  });

  deepEqual(json, {
    "id": 1,
    "name": "Dr Horrible",
    "evilMinions": [{
      type: "evilMinions/yellowMinion",
      id: 12
    }]
  });
});

test("extractPolymorphic", function() {
  var json_hash = {
    doomsday_device: { id: 1, name: "DeathRay", evil_minion: { type: "EvilMinions::YellowMinion", id: 12 } },
    evil_minions:    [{ id: 12, name: "Alex", doomsday_device_ids: [1] }]
  };
  var json;

  run(function() {
    json = env.amsSerializer.extractSingle(env.store, DoomsdayDevice, json_hash);
  });

  deepEqual(json, {
    "id": 1,
    "name": "DeathRay",
    "evilMinion": {
      type: "evilMinions/yellowMinion",
      id: 12
    }
  });
});
