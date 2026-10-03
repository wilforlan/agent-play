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
      legend: `Near ${input.facultyLabel}. Class in session · P/A: enter classroom`,
      prompt: "P: enter classroom\nA: enter classroom",
    };
  }
  if (!input.hasEnrollment) {
    return {
      canEnter: true,
      canChoosePath: true,
      canStartClass: false,
      legend: `Near ${input.facultyLabel}. P: browse · A: choose path · C: needs school fees`,
      prompt: "P: browse classroom\nA: choose path\nC: needs school fees",
    };
  }
  return {
    canEnter: true,
    canChoosePath: true,
    canStartClass: true,
    legend: `Near ${input.facultyLabel}. P/A: enter class · C: enter class`,
    prompt: "P: enter class\nA: enter class\nC: enter class",
  };
};
