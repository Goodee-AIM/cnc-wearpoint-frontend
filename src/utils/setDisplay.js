const SET_NAMES = {
  manual: "Set test",
  4: "Set 1",
  5: "Set 2",
  6: "Set 3",
  7: "Set 4",
  8: "Set 5",
  9: "Set 6",
  10: "Set 7",
  11: "Set 8",
};

export function getSetName(setNumber) {
  return SET_NAMES[setNumber] ?? `Set ${setNumber}`;
}