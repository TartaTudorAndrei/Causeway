package com.charityapp;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import com.google.api.services.gmail.Gmail;

@SpringBootTest
@ActiveProfiles("test")
class CharityAppApplicationTests {

	@MockitoBean
	private Gmail gmail;

	@Test
	void contextLoads() {
	}

}
