import { Ionicons } from '@expo/vector-icons';
import { Pressable, TextInput, View } from 'react-native';

import { Typo } from '@/components/ui';
import type { CalloutComponent } from '@correctiv/app-core/data/callouts';
import { typography, useColors } from '@/lib/theme';

/**
 * One field of a callout form. The schema arrives from the core in Beabee/Formio
 * shape (`slides[].components[]`), so that a later phase only has to swap the data
 * layer — this component is the translation of one `component` into controls.
 *
 * `file` is a deliberate dummy: the prototype uploads nothing, and does not pretend
 * to. A real picker (expo-image-picker) would be another native module for a flow
 * that goes nowhere without a backend.
 */
export function FormField({
  component,
  choice,
  text,
  fileAttached,
  onSelect,
  onText,
  onToggleFile,
}: {
  component: CalloutComponent;
  choice: string[];
  text: string;
  fileAttached: boolean;
  onSelect: (value: string) => void;
  onText: (value: string) => void;
  onToggleFile: () => void;
}) {
  const colors = useColors();
  return (
    <View className="mt-m">
      <Typo variant="headline-xs">{component.label}</Typo>
      {component.description && (
        <Typo variant="text-s" color="grey-600" className="mt-2xs">
          {component.description}
        </Typo>
      )}

      {(component.type === 'radio' || component.type === 'selectboxes') && (
        <View className="mt-s">
          {(component.values ?? []).map((value) => {
            const selected = choice.includes(value.value);
            return (
              <Pressable
                key={value.value}
                accessibilityRole={component.type === 'radio' ? 'radio' : 'checkbox'}
                accessibilityState={{ checked: selected }}
                accessibilityLabel={value.label}
                onPress={() => onSelect(value.value)}
                className={[
                  'mb-2xs flex-row items-center rounded-md border px-s py-s active:opacity-80',
                  selected ? 'border-emphasis bg-grey-200' : 'border-grey-300 bg-grey-100',
                ].join(' ')}
              >
                <Ionicons
                  name={selected ? 'checkmark-circle' : 'ellipse-outline'}
                  size={20}
                  color={selected ? colors.emphasis : colors['grey-400']}
                />
                <Typo variant="text-m" className="ml-s flex-1">
                  {value.label}
                </Typo>
              </Pressable>
            );
          })}
        </View>
      )}

      {(component.type === 'textarea' || component.type === 'textfield') && (
        <TextInput
          value={text}
          onChangeText={onText}
          placeholder={component.placeholder ?? 'Ihre Antwort …'}
          placeholderTextColor={colors['grey-500']}
          accessibilityLabel={component.label}
          multiline={component.type === 'textarea'}
          className="mt-s rounded-md border border-grey-300 bg-grey-100 px-s py-s"
          style={[
            typography['text-m'],
            {
              color: colors['grey-700'],
              minHeight: component.type === 'textarea' ? 96 : undefined,
              textAlignVertical: component.type === 'textarea' ? 'top' : 'center',
            },
          ]}
        />
      )}

      {component.type === 'file' && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={component.label}
          onPress={onToggleFile}
          className="mt-s flex-row items-center rounded-md border border-grey-300 bg-grey-200 px-s py-s active:opacity-80"
        >
          <Ionicons name="camera-outline" size={20} color={colors['grey-600']} />
          <Typo variant="text-s" color="grey-600" className="ml-s flex-1">
            {fileAttached
              ? 'foto_2026-06-12.jpg angehängt ✓'
              : 'Foto oder Dokument auswählen (simuliert)'}
          </Typo>
        </Pressable>
      )}
    </View>
  );
}
