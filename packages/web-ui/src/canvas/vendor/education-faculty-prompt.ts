/**
 * Pure prompt rules for Elm Street faculty proximity after day-gate payment.
 */

export type FacultyProximityActions = {
  readonly canEnter: boolean;
  readonly canChoosePath: boolean;
  readonly canStartClass: boolean;
  readonly legend: string;
  readonly prompt: string;
};

export const resolveFacultyProximityActions = (input: {
  hasDayPass: boolean;
  hasEnrollment: boolean;
  facultyLabel: string;
  inClassSession?: boolean;
}): FacultyProximityActions => {
  if (!input.hasDayPass) {
    return {
      canEnter: false,
      canChoosePath: false,
      canStartClass: false,
      legend: `Near ${input.facultyLabel}. Pay day entry to unlock`,
      prompt: "Day entry required",
    };
  }
  if (input.inClassSession === true) {
    return {
      canEnter: true,
      canChoosePath: true,
      canStartClass: true,
      legend: `Near ${input.facultyLabel}. Class in session · A: open lesson cards inside`,
      prompt: "P: enter classroom",
    };
  }
  if (!input.hasEnrollment) {
    return {
      canEnter: true,
      canChoosePath: true,
      canStartClass: false,
      legend: `Near ${input.facultyLabel}. P: enter · A: choose path · C: start class (needs fees)`,
      prompt: "P: enter\nA: choose path\nC: needs school fees",
    };
  }
  return {
    canEnter: true,
    canChoosePath: true,
    canStartClass: true,
    legend: `Near ${input.facultyLabel}. P: enter · A: paths · C: start class`,
    prompt: "P: enter classroom\nA: choose path\nC: start class",
  };
};
