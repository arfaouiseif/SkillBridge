export function computeScore(
    theyTeachMeCount: number,
    myLearnTotal: number,
    iTeachThemCount: number,
    myTeachTotal: number,
): number {
    const learnSide = myLearnTotal > 0 ? theyTeachMeCount / myLearnTotal :0;
    const teachSide = myTeachTotal > 0 ? iTeachThemCount / myTeachTotal : 0;
    return Math.round(((learnSide + teachSide) / 2 ) * 100);
}