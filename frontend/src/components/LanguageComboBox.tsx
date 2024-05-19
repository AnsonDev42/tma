import { Button } from "@/components/ui/button.tsx";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command.tsx";
import { PopoverContent } from "@/components/ui/popover.tsx";
import {
	Language,
	languages,
	useLanguageContext,
} from "@/contexts/LanguageContext.tsx";
import { CaretSortIcon } from "@radix-ui/react-icons";
import { Popover, PopoverTrigger } from "@radix-ui/react-popover";
import React, { useEffect } from "react";

export function LanguageComboBox() {
	const [open, setOpen] = React.useState(false);
	const { selectedLanguage, setSelectedLanguage } = useLanguageContext();
	// set default language based on browser language
	useEffect(() => {
		if (!selectedLanguage) {
			const browserLanguage = navigator.language || navigator.languages[0];
			// Get the main language part e.g. "zh" from "zh-cn"
			const languagePrefix = browserLanguage.split("-")[0];
			const defaultLanguage =
				languages.find((language) =>
					language.value.startsWith(languagePrefix),
				) ||
				languages.find((language) => language.value === "en") ||
				null;
			setSelectedLanguage(defaultLanguage as Language);
		}
	}, [selectedLanguage, setSelectedLanguage]);

	return (
		<div className="flex items-center space-x-4">
			<p className="text-sm text-muted-foreground">Translate to a language.</p>
			<Popover open={open} onOpenChange={setOpen}>
				<PopoverTrigger asChild>
					<Button variant="outline" className="w-[200px] justify-between">
						{selectedLanguage
							? languages.find(
									(language) => language.value === selectedLanguage.value,
								)?.label
							: "Select language..."}
						<CaretSortIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-[200px] p-0">
					<Command>
						<CommandInput placeholder="Change language..." />
						<CommandList>
							<CommandEmpty>No results found.</CommandEmpty>
							<CommandGroup>
								{languages.map((status) => (
									<CommandItem
										key={status.value}
										value={status.value}
										onSelect={(value: string) => {
											setSelectedLanguage(
												languages.find(
													(priority) => priority.value === value,
												) || null,
											);
											setOpen(false);
										}}
									>
										{status.label}
									</CommandItem>
								))}
							</CommandGroup>
						</CommandList>
					</Command>
				</PopoverContent>
			</Popover>
		</div>
	);
}
