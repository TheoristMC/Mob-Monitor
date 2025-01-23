import { world, Player, Entity, system } from "@minecraft/server";
import {
  ActionFormData,
  MessageFormData,
  ModalFormData,
} from "@minecraft/server-ui";

function capitalizeName(str) {
  const splitted = str.split(" ");
  const capital = splitted.map((char) => char[0].toUpperCase() + char.slice(1));
  return capital.join(" ");
}

/**
 *
 * @param {Entity} target
 * @param {Player} player
 */
function addEntityToWatcher(target, player) {
  const addEntityToWatcherForm = new ModalFormData()
    .title(`Mob Link`)
    .textField(
      "Name:",
      "Type the name for this entity...",
      capitalizeName(target.typeId.split(":")[1].replaceAll("_", " "))
    )
    .textField(
      "Description (Optional):",
      "Type the description for this entity..."
    )
    .submitButton("Link");
  addEntityToWatcherForm.show(player).then((data) => {
    if (data.canceled) return;
    const mobName = data.formValues[0];

    const watcherList = JSON.parse(
      player.getDynamicProperty("mobWatcherList") || "[]"
    );

    const hasSameID = watcherList.some((mob) => mob.id === target.id);
    if (hasSameID) {
      player.sendMessage("§cYou can't link the same mob twice!");
      return;
    }

    if (mobName.length > 12 || !mobName) {
      player.sendMessage(
        "§cNames cannot be nothing or longer than 12 characters."
      );
      return;
    }

    watcherList.push({
      name: mobName,
      description: data.formValues[1],
      id: target.id,
      location: target.location,
    });

    player.sendMessage(`§aAdded "${mobName}" from the list.`);
    player.setDynamicProperty("mobWatcherList", JSON.stringify(watcherList));
  });
}

/**
 *
 * @param {Player} player
 */
function entityWatcher(player) {
  const watcherList = JSON.parse(
    player.getDynamicProperty("mobWatcherList") || "[]"
  );

  if (watcherList.length === 0) {
    player.sendMessage("§cYou have no existing mobs in your watcher yet.");
    return;
  }

  const entityWatcherForm = new ActionFormData().title(
    `${player.name} Mobs§m§w§=`
  );
  watcherList.forEach((mob) => entityWatcherForm.button(`${mob.name}`, mob.id));
  entityWatcherForm.show(player).then((data) => {
    if (data.canceled) return;

    deleteMobFromWatcher(data.selection, player);
  });
}

/**
 *
 * @param {Player} player
 */
function deleteMobFromWatcher(index, player) {
  const watcherList = JSON.parse(
    player.getDynamicProperty("mobWatcherList") || "[]"
  );
  const deleteMobFromWatcherForm = new MessageFormData()
    .title(watcherList[index].name)
    .body(
      `Location Linked: ${Object.values(watcherList[index].location)
        .map((coord) => coord.toFixed())
        .join(", ")}\nDescription:\n - ${
        watcherList[index].description || "No Description."
      }`
    )
    .button1("Cancel")
    .button2("Delete");
  deleteMobFromWatcherForm.show(player).then((data) => {
    if (data.canceled) return;

    if (data.selection === 1) {
      player.sendMessage(
        `§aDeleted "${watcherList[index].name}" from the list.`
      );
      watcherList.splice(index, 1);
      player.setDynamicProperty("mobWatcherList", JSON.stringify(watcherList));
    } else {
      entityWatcher(player);
    }
  });
}

world.beforeEvents.playerInteractWithEntity.subscribe((ev) => {
  const { player, target, itemStack } = ev;
  if (player.isSneaking && itemStack?.typeId === "mm:mob_monitor") {
    ev.cancel = true;
    system.run(() => addEntityToWatcher(target, player));
  }
});

world.afterEvents.itemUse.subscribe((ev) => {
  const { itemStack, source } = ev;
  if (!source.isSneaking && itemStack.typeId === "mm:mob_monitor") {
    entityWatcher(source);
  }
});