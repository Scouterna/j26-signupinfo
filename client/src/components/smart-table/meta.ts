export type ChoiceOption = {
	value: string | number;
	label: string;
};

export type DataType =
	| {
			type: "string";
	  }
	| {
			type: "number";
	  }
	| {
			type: "choice";
			options: ChoiceOption[];
	  };
